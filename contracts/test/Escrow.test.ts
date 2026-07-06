import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Escrow", function () {
  let escrow: any;
  let token: any;
  let admin: HardhatEthersSigner, seller: HardhatEthersSigner, buyer: HardhatEthersSigner, feeRecipient: HardhatEthersSigner;

  const AMOUNT = ethers.parseEther("1000");

  beforeEach(async function () {
    [admin, seller, buyer, feeRecipient] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("USD Coin", "USDC", ethers.parseEther("1000000"));
    await token.waitForDeployment();

    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(admin.address, feeRecipient.address);
    await escrow.waitForDeployment();

    await token.transfer(seller.address, AMOUNT);
    await token.connect(seller).approve(await escrow.getAddress(), AMOUNT);
  });

  it("creates a trade and locks seller tokens", async function () {
    await expect(escrow.connect(seller).createTrade(await token.getAddress(), AMOUNT, 3600))
      .to.emit(escrow, "TradeCreated");

    const trade = await escrow.getTrade(1);
    expect(trade.seller).to.equal(seller.address);
    expect(trade.amount).to.equal(AMOUNT);
    expect(trade.status).to.equal(1); // Created
  });

  it("runs the full happy-path trade lifecycle", async function () {
    await escrow.connect(seller).createTrade(await token.getAddress(), AMOUNT, 3600);
    await escrow.connect(buyer).joinTrade(1);
    await escrow.connect(buyer).markPaid(1);
    await escrow.connect(seller).release(1);

    const trade = await escrow.getTrade(1);
    expect(trade.status).to.equal(3); // Released

    const fee = (AMOUNT * 50n) / 10000n;
    expect(await token.balanceOf(buyer.address)).to.equal(AMOUNT - fee);
    expect(await token.balanceOf(feeRecipient.address)).to.equal(fee);
  });

  it("allows seller to cancel before a buyer joins", async function () {
    await escrow.connect(seller).createTrade(await token.getAddress(), AMOUNT, 3600);
    await escrow.connect(seller).cancel(1);

    expect(await token.balanceOf(seller.address)).to.equal(AMOUNT);
  });

  it("prevents releasing funds before payment is marked", async function () {
    await escrow.connect(seller).createTrade(await token.getAddress(), AMOUNT, 3600);
    await escrow.connect(buyer).joinTrade(1);
    await expect(escrow.connect(seller).release(1)).to.be.revertedWith("Escrow: payment not marked");
  });

  it("routes disputes to the arbitrator for resolution", async function () {
    await escrow.connect(seller).createTrade(await token.getAddress(), AMOUNT, 3600);
    await escrow.connect(buyer).joinTrade(1);
    await escrow.connect(buyer).dispute(1);

    await escrow.connect(admin).resolve(1, true); // refund seller
    expect(await token.balanceOf(seller.address)).to.equal(AMOUNT);
  });

  it("rejects non-arbitrators trying to resolve disputes", async function () {
    await escrow.connect(seller).createTrade(await token.getAddress(), AMOUNT, 3600);
    await escrow.connect(buyer).joinTrade(1);
    await escrow.connect(buyer).dispute(1);

    await expect(escrow.connect(buyer).resolve(1, true)).to.be.reverted;
  });
});
