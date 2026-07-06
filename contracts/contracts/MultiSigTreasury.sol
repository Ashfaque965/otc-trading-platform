// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MultiSigTreasury
/// @notice Simple N-of-M multisig for platform fee withdrawals and treasury management.
///         Owners submit proposals; once `threshold` confirmations are reached, anyone
///         can execute the proposal.
contract MultiSigTreasury {
    using SafeERC20 for IERC20;

    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer, address token, address to, uint256 amount);
    event ProposalConfirmed(uint256 indexed proposalId, address indexed owner);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalRevoked(uint256 indexed proposalId, address indexed owner);

    struct Proposal {
        address token; // address(0) for native ETH
        address to;
        uint256 amount;
        bool executed;
        uint256 confirmations;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => bool)) public hasConfirmed;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "MultiSig: not an owner");
        _;
    }

    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "MultiSig: owners required");
        require(_threshold > 0 && _threshold <= _owners.length, "MultiSig: invalid threshold");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0) && !isOwner[owner], "MultiSig: invalid owner");
            isOwner[owner] = true;
            owners.push(owner);
            emit OwnerAdded(owner);
        }
        threshold = _threshold;
    }

    receive() external payable {}

    function submitProposal(address token, address to, uint256 amount) external onlyOwner returns (uint256 proposalId) {
        require(to != address(0), "MultiSig: zero recipient");
        proposalId = proposals.length;
        proposals.push(Proposal({ token: token, to: to, amount: amount, executed: false, confirmations: 0 }));
        emit ProposalSubmitted(proposalId, msg.sender, token, to, amount);
        _confirm(proposalId);
    }

    function confirmProposal(uint256 proposalId) external onlyOwner {
        _confirm(proposalId);
    }

    function _confirm(uint256 proposalId) internal {
        require(proposalId < proposals.length, "MultiSig: invalid proposal");
        require(!hasConfirmed[proposalId][msg.sender], "MultiSig: already confirmed");

        hasConfirmed[proposalId][msg.sender] = true;
        proposals[proposalId].confirmations += 1;

        emit ProposalConfirmed(proposalId, msg.sender);
    }

    function revokeConfirmation(uint256 proposalId) external onlyOwner {
        require(hasConfirmed[proposalId][msg.sender], "MultiSig: not confirmed");
        hasConfirmed[proposalId][msg.sender] = false;
        proposals[proposalId].confirmations -= 1;
        emit ProposalRevoked(proposalId, msg.sender);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "MultiSig: already executed");
        require(p.confirmations >= threshold, "MultiSig: not enough confirmations");

        p.executed = true;

        if (p.token == address(0)) {
            (bool ok, ) = p.to.call{value: p.amount}("");
            require(ok, "MultiSig: ETH transfer failed");
        } else {
            IERC20(p.token).safeTransfer(p.to, p.amount);
        }

        emit ProposalExecuted(proposalId);
    }

    function proposalCount() external view returns (uint256) {
        return proposals.length;
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }
}
