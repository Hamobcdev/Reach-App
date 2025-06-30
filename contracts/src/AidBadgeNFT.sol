// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract AidBadgeNFT is ERC721URIStorage, AccessControl {
    uint256 public tokenIdCounter;
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    constructor() ERC721("CrisisAidBadge", "CAB") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        tokenIdCounter = 1; // Start from 1 for clarity
    }

    function issueBadge(address to, string memory tokenURI) public onlyRole(ISSUER_ROLE) {
        _mint(to, tokenIdCounter);
        _setTokenURI(tokenIdCounter, tokenURI);
        tokenIdCounter++;
    }

    function revokeBadge(uint256 tokenId) public onlyRole(ISSUER_ROLE) {
        _burn(tokenId);
    }

    // Override to support ERC721URIStorage
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}