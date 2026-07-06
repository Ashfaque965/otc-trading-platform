import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy MultiSigTreasury (deployer as sole initial owner, threshold 1 for local/testnet demo)
  const MultiSig = await ethers.getContractFactory("MultiSigTreasury");
  const multisig = await MultiSig.deploy([deployer.address], 1);
  await multisig.waitForDeployment();
  console.log("MultiSigTreasury deployed to:", await multisig.getAddress());

  // 2. Deploy FeeManager
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(deployer.address);
  await feeManager.waitForDeployment();
  console.log("FeeManager deployed to:", await feeManager.getAddress());

  // 3. Deploy Escrow, routing fees to the multisig treasury
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(deployer.address, await multisig.getAddress());
  await escrow.waitForDeployment();
  console.log("Escrow deployed to:", await escrow.getAddress());

  console.log("\nAdd these to your .env:");
  console.log(`ESCROW_CONTRACT_ADDRESS=${await escrow.getAddress()}`);
  console.log(`FEE_CONTRACT_ADDRESS=${await feeManager.getAddress()}`);
  console.log(`TREASURY_ADDRESS=${await multisig.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
