// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../lib/forge-std/src/Test.sol";
import "../src/AidStableCoin.sol";
import "../src/AidBadgeNFT.sol";
import "../src/AidManager.sol";
import "../src/MockV3Aggregator.sol";

contract AidManagerTest is Test {
    AidStableCoin stable;
    AidBadgeNFT badge;
    AidManager manager;
    MockV3Aggregator mockPriceFeed;

    address admin = address(0x1);
    address ngo = address(0x2);
    address user = address(0x3);

    function setUp() public {
        vm.startPrank(admin);
        mockPriceFeed = new MockV3Aggregator(245000000); // 2.45 USD/WST
        stable = new AidStableCoin("Samoa Aid Token", "SAT");
        badge = new AidBadgeNFT();
        manager = new AidManager(address(stable), address(badge), address(mockPriceFeed), true);

        stable.grantRole(stable.MINTER_ROLE(), address(manager));
        badge.grantRole(badge.ISSUER_ROLE(), address(manager));
        manager.authorizeNGO(ngo);
        vm.stopPrank();
    }

    function testMintAidStableCoinToUser() public {
        vm.prank(ngo);
        manager.distributeAid(user, 1000e18); // 1000 SAT
        assertEq(stable.balanceOf(user), 1000e18);
    }

    function testNGOCanDisburseAid() public {
        vm.prank(ngo);
        manager.distributeAid(user, 1000e18);
        assertEq(stable.balanceOf(user), 1000e18);
        uint256 usdValue = manager.getUSDValue(1000e18);
        assertEq(usdValue, 2450e18); // 1000 * 2.45
    }

    function testIssueAndRevokeNFTBadge() public {
        vm.startPrank(ngo);
        manager.issueCrisisBadge(user, "ipfs://test-uri");
        assertEq(badge.balanceOf(user), 1);
        assertEq(badge.ownerOf(1), user);

        vm.stopPrank();
        vm.prank(admin);
        badge.revokeBadge(1);
        vm.expectRevert();
        badge.ownerOf(1); // Should revert as token is burned
    }

    function testUnauthorizedUserFailsToDisburseAid() public {
        vm.prank(address(0x4)); // Unauthorized
        vm.expectRevert("Not an authorized NGO");
        manager.distributeAid(user, 1000e18);
    }
}