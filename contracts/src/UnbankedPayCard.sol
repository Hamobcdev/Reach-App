// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "lib/openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";
import "lib/openzeppelin-contracts-upgradeable/contracts/utils/Counters.sol";

contract UnbankedPayCard is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    Counters.Counter private _cardIds;
    
    struct VirtualCard {
        uint256 id;
        address owner;
        uint256 balance; // in wei
        string currency; // ISO code
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 dailySpent;
        uint256 monthlySpent;
        uint256 lastResetDay;
        uint256 lastResetMonth;
        bool isActive;
        uint8 kycTier; // 1, 2, or 3
        string region; // africa, asia, global
    }
    
    mapping(uint256 => VirtualCard) public virtualCards;
    mapping(address => uint256[]) public userCards;
    mapping(string => bool) public supportedCurrencies;
    
    event CardCreated(uint256 indexed cardId, address indexed owner, string currency, string region);
    event CardFunded(uint256 indexed cardId, uint256 amount, string currency);
    event CardUsed(uint256 indexed cardId, uint256 amount, address merchant);
    event LimitsUpdated(uint256 indexed cardId, uint256 dailyLimit, uint256 monthlyLimit);
    
    constructor() ERC721("UnbankedPayCard", "UPC") {
        // Initialize supported currencies
        supportedCurrencies["USD"] = true;
        supportedCurrencies["EUR"] = true;
        supportedCurrencies["NGN"] = true;
        supportedCurrencies["KES"] = true;
        supportedCurrencies["PHP"] = true;
        supportedCurrencies["INR"] = true;
        supportedCurrencies["ZAR"] = true;
        supportedCurrencies["GHS"] = true;
    }
    
    function createCard(
        string memory currency,
        string memory region,
        uint8 kycTier
    ) external returns (uint256) {
        require(supportedCurrencies[currency], "Currency not supported");
        require(kycTier >= 1 && kycTier <= 3, "Invalid KYC tier");
        
        _cardIds.increment();
        uint256 newCardId = _cardIds.current();
        
        // Set limits based on KYC tier
        uint256 dailyLimit = kycTier == 1 ? 100 ether : kycTier == 2 ? 500 ether : 2500 ether;
        uint256 monthlyLimit = kycTier == 1 ? 1000 ether : kycTier == 2 ? 5000 ether : 25000 ether;
        
        virtualCards[newCardId] = VirtualCard({
            id: newCardId,
            owner: msg.sender,
            balance: 0,
            currency: currency,
            dailyLimit: dailyLimit,
            monthlyLimit: monthlyLimit,
            dailySpent: 0,
            monthlySpent: 0,
            lastResetDay: block.timestamp / 1 days,
            lastResetMonth: block.timestamp / 30 days,
            isActive: true,
            kycTier: kycTier,
            region: region
        });
        
        userCards[msg.sender].push(newCardId);
        _safeMint(msg.sender, newCardId);
        
        emit CardCreated(newCardId, msg.sender, currency, region);
        return newCardId;
    }
    
    function fundCard(uint256 cardId) external payable nonReentrant {
        require(_exists(cardId), "Card does not exist");
        require(msg.value > 0, "Must send ETH to fund card");
        
        VirtualCard storage card = virtualCards[cardId];
        require(card.isActive, "Card is not active");
        
        card.balance += msg.value;
        emit CardFunded(cardId, msg.value, card.currency);
    }
    
    function useCard(
        uint256 cardId,
        uint256 amount,
        address merchant
    ) external nonReentrant {
        require(_exists(cardId), "Card does not exist");
        require(ownerOf(cardId) == msg.sender, "Not card owner");
        
        VirtualCard storage card = virtualCards[cardId];
        require(card.isActive, "Card is not active");
        require(card.balance >= amount, "Insufficient balance");
        
        // Reset daily/monthly limits if needed
        _resetLimitsIfNeeded(cardId);
        
        // Check limits
        require(card.dailySpent + amount <= card.dailyLimit, "Daily limit exceeded");
        require(card.monthlySpent + amount <= card.monthlyLimit, "Monthly limit exceeded");
        
        // Update balances and spending
        card.balance -= amount;
        card.dailySpent += amount;
        card.monthlySpent += amount;
        
        // Transfer to merchant (in a real implementation, this would be more complex)
        payable(merchant).transfer(amount);
        
        emit CardUsed(cardId, amount, merchant);
    }
    
    function _resetLimitsIfNeeded(uint256 cardId) internal {
        VirtualCard storage card = virtualCards[cardId];
        uint256 currentDay = block.timestamp / 1 days;
        uint256 currentMonth = block.timestamp / 30 days;
        
        if (currentDay > card.lastResetDay) {
            card.dailySpent = 0;
            card.lastResetDay = currentDay;
        }
        
        if (currentMonth > card.lastResetMonth) {
            card.monthlySpent = 0;
            card.lastResetMonth = currentMonth;
        }
    }
    
    function getCard(uint256 cardId) external view returns (VirtualCard memory) {
        require(_exists(cardId), "Card does not exist");
        return virtualCards[cardId];
    }
    
    function getUserCards(address user) external view returns (uint256[] memory) {
        return userCards[user];
    }
    
    function addSupportedCurrency(string memory currency) external onlyOwner {
        supportedCurrencies[currency] = true;
    }
    
    function deactivateCard(uint256 cardId) external {
        require(ownerOf(cardId) == msg.sender || msg.sender == owner(), "Not authorized");
        virtualCards[cardId].isActive = false;
    }
}