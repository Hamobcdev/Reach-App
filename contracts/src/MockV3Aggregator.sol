// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Mock price feed for testing
contract MockV3Aggregator {
    uint8 public decimals = 8;
    int256 public latestPrice;

    constructor(int256 _initialPrice) {
        latestPrice = _initialPrice; // e.g., 245000000 for 2.45 USD/WST
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (0, latestPrice, 0, block.timestamp, 0);
    }

    // For testing: allow updating mock price
    function updatePrice(int256 _newPrice) external {
        latestPrice = _newPrice;
    }
}