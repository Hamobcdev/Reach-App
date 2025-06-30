// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AidStableCoin.sol";
import "./AidBadgeNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "contracts/lib/chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract AidManager is Ownable {
    AidStableCoin public token;
    AidBadgeNFT public badge;
    AggregatorV3Interface public priceFeed;
    bool public useMockPriceFeed;

    mapping(address => bool) public authorizedNGOs;

    // Event for tracking aid distribution
    event AidDistributed(address indexed recipient, uint256 amount, uint256 usdValue);
    event BadgeIssued(address indexed recipient, uint256 tokenId, string tokenURI);

    constructor(address _token, address _badge, address _priceFeed, bool _useMockPriceFeed) {
        token = AidStableCoin(_token);
        badge = AidBadgeNFT(_badge);
        priceFeed = AggregatorV3Interface(_priceFeed);
        useMockPriceFeed = _useMockPriceFeed;
    }

    modifier onlyNGO() {
        require(authorizedNGOs[msg.sender], "Not an authorized NGO");
        _;
    }

    function authorizeNGO(address ngo) external onlyOwner {
        authorizedNGOs[ngo] = true;
    }

    function revokeNGO(address ngo) external onlyOwner {
        authorizedNGOs[ngo] = false;
    }

    function distributeAid(address recipient, uint256 amount) external onlyNGO {
        require(recipient != address(0), "Invalid recipient");
        token.mint(recipient, amount);
        uint256 usdValue = useMockPriceFeed ? amount : getUSDValue(amount);
        emit AidDistributed(recipient, amount, usdValue);
    }

    function issueCrisisBadge(address user, string memory tokenURI) external onlyNGO {
        require(user != address(0), "Invalid user");
        badge.issueBadge(user, tokenURI);
        emit BadgeIssued(user, badge.tokenIdCounter() - 1, tokenURI);
    }

    function getUSDValue(uint256 amount) public view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price feed");
        // Assuming amount is in SAT (1:1 with USD for simplicity in mock)
        return uint256(price) * amount / 1e8; // Chainlink returns 8 decimals
    }
}