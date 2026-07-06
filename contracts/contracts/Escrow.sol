// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Escrow
/// @notice Holds ERC-20 tokens on behalf of a seller until an off-chain (fiat/stablecoin)
///         payment is confirmed by the buyer and seller, then releases funds.
///         Includes a dispute path resolved by an ARBITRATOR_ROLE holder (e.g. platform admin
///         multisig, or in the DAO variant, a governance-elected arbitrator committee).
contract Escrow is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    enum TradeStatus {
        None,
        Created, // seller has deposited tokens, awaiting buyer payment
        Paid, // buyer marked fiat/stablecoin payment as sent
        Released, // seller confirmed, tokens released to buyer
        Cancelled, // cancelled before deposit was matched with payment
        Disputed, // either party raised a dispute
        Refunded // arbitrator refunded seller
    }

    struct Trade {
        address seller;
        address buyer;
        address token;
        uint256 amount;
        uint256 feeBps; // fee in basis points (1% = 100)
        TradeStatus status;
        uint256 createdAt;
        uint256 expiresAt;
    }

    uint256 public nextTradeId = 1;
    mapping(uint256 => Trade) public trades;

    address public feeRecipient;
    uint256 public defaultFeeBps = 50; // 0.5% default platform fee

    event TradeCreated(uint256 indexed tradeId, address indexed seller, address token, uint256 amount, uint256 expiresAt);
    event TradeJoined(uint256 indexed tradeId, address indexed buyer);
    event PaymentMarked(uint256 indexed tradeId, address indexed buyer);
    event FundsReleased(uint256 indexed tradeId, address indexed to, uint256 amount, uint256 fee);
    event TradeCancelled(uint256 indexed tradeId);
    event DisputeOpened(uint256 indexed tradeId, address indexed opener);
    event DisputeResolved(uint256 indexed tradeId, bool refundedToSeller);
    event FeeRecipientUpdated(address indexed newRecipient);
    event DefaultFeeUpdated(uint256 newFeeBps);

    modifier onlyTradeParty(uint256 tradeId) {
        Trade storage t = trades[tradeId];
        require(msg.sender == t.seller || msg.sender == t.buyer, "Escrow: not a trade party");
        _;
    }

    constructor(address admin, address _feeRecipient) {
        require(admin != address(0) && _feeRecipient != address(0), "Escrow: zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ARBITRATOR_ROLE, admin);
        _grantRole(FEE_MANAGER_ROLE, admin);
        feeRecipient = _feeRecipient;
    }

    /// @notice Seller creates a trade and deposits `amount` of `token` into escrow.
    /// @param token ERC-20 token being sold
    /// @param amount Amount of token to escrow (in token's smallest unit)
    /// @param durationSeconds How long the trade offer remains open before it can be cancelled by the seller
    function createTrade(address token, uint256 amount, uint256 durationSeconds)
        external
        nonReentrant
        returns (uint256 tradeId)
    {
        require(token != address(0), "Escrow: zero token");
        require(amount > 0, "Escrow: zero amount");

        tradeId = nextTradeId++;

        trades[tradeId] = Trade({
            seller: msg.sender,
            buyer: address(0),
            token: token,
            amount: amount,
            feeBps: defaultFeeBps,
            status: TradeStatus.Created,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + durationSeconds
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit TradeCreated(tradeId, msg.sender, token, amount, block.timestamp + durationSeconds);
    }

    /// @notice Buyer joins an open trade, locking in themselves as the counterparty.
    function joinTrade(uint256 tradeId) external {
        Trade storage t = trades[tradeId];
        require(t.status == TradeStatus.Created, "Escrow: not open");
        require(t.buyer == address(0), "Escrow: already has buyer");
        require(msg.sender != t.seller, "Escrow: seller cannot be buyer");
        require(block.timestamp <= t.expiresAt, "Escrow: trade expired");

        t.buyer = msg.sender;
        emit TradeJoined(tradeId, msg.sender);
    }

    /// @notice Buyer marks that off-chain (fiat/stablecoin) payment has been sent.
    function markPaid(uint256 tradeId) external {
        Trade storage t = trades[tradeId];
        require(msg.sender == t.buyer, "Escrow: only buyer");
        require(t.status == TradeStatus.Created, "Escrow: invalid status");

        t.status = TradeStatus.Paid;
        emit PaymentMarked(tradeId, msg.sender);
    }

    /// @notice Seller confirms receipt of payment; releases escrowed tokens to buyer minus fee.
    function release(uint256 tradeId) external nonReentrant {
        Trade storage t = trades[tradeId];
        require(msg.sender == t.seller, "Escrow: only seller");
        require(t.status == TradeStatus.Paid, "Escrow: payment not marked");

        t.status = TradeStatus.Released;

        uint256 fee = (t.amount * t.feeBps) / 10_000;
        uint256 payout = t.amount - fee;

        IERC20(t.token).safeTransfer(t.buyer, payout);
        if (fee > 0) {
            IERC20(t.token).safeTransfer(feeRecipient, fee);
        }

        emit FundsReleased(tradeId, t.buyer, payout, fee);
    }

    /// @notice Seller cancels an un-joined or unpaid trade and reclaims tokens.
    function cancel(uint256 tradeId) external nonReentrant {
        Trade storage t = trades[tradeId];
        require(msg.sender == t.seller, "Escrow: only seller");
        require(t.status == TradeStatus.Created, "Escrow: cannot cancel now");

        t.status = TradeStatus.Cancelled;
        IERC20(t.token).safeTransfer(t.seller, t.amount);

        emit TradeCancelled(tradeId);
    }

    /// @notice Either party opens a dispute once a trade is in Created or Paid state.
    function dispute(uint256 tradeId) external onlyTradeParty(tradeId) {
        Trade storage t = trades[tradeId];
        require(
            t.status == TradeStatus.Created || t.status == TradeStatus.Paid,
            "Escrow: cannot dispute in current status"
        );

        t.status = TradeStatus.Disputed;
        emit DisputeOpened(tradeId, msg.sender);
    }

    /// @notice Arbitrator resolves a dispute, sending escrowed funds to either buyer or seller.
    /// @param refundToSeller true = tokens return to seller, false = tokens released to buyer
    function resolve(uint256 tradeId, bool refundToSeller) external nonReentrant onlyRole(ARBITRATOR_ROLE) {
        Trade storage t = trades[tradeId];
        require(t.status == TradeStatus.Disputed, "Escrow: not disputed");

        if (refundToSeller) {
            t.status = TradeStatus.Refunded;
            IERC20(t.token).safeTransfer(t.seller, t.amount);
        } else {
            t.status = TradeStatus.Released;
            uint256 fee = (t.amount * t.feeBps) / 10_000;
            uint256 payout = t.amount - fee;
            IERC20(t.token).safeTransfer(t.buyer, payout);
            if (fee > 0) {
                IERC20(t.token).safeTransfer(feeRecipient, fee);
            }
        }

        emit DisputeResolved(tradeId, refundToSeller);
    }

    // ---------------- Admin ----------------

    function setFeeRecipient(address newRecipient) external onlyRole(FEE_MANAGER_ROLE) {
        require(newRecipient != address(0), "Escrow: zero address");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function setDefaultFeeBps(uint256 newFeeBps) external onlyRole(FEE_MANAGER_ROLE) {
        require(newFeeBps <= 1000, "Escrow: fee too high"); // cap at 10%
        defaultFeeBps = newFeeBps;
        emit DefaultFeeUpdated(newFeeBps);
    }

    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }
}
