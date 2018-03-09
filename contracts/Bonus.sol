pragma solidity ^0.4.18;

import "./SafeMath.sol";

contract Bonus {
    using SafeMath for uint256;

    uint256 public maxSupplySale;

    uint256 public firstBonusCap;
    uint256 public firstBonusPercent = 25;

    uint256 public secondBonusCap;
    uint256 public secondBonusPercent = 20;

    uint256 public thirdBonusCap;
    uint256 public thirdBonusPercent = 15;

    uint256 public fourthBonusCap;
    uint256 public fourthBonusPercent = 5;


    function Bonus(uint256 _maxSupplySale) public {
        maxSupplySale = _maxSupplySale;
        firstBonusCap = maxSupplySale.percent(20);
        secondBonusCap = maxSupplySale.percent(40);
        thirdBonusCap = maxSupplySale.percent(60);
        fourthBonusCap = maxSupplySale.percent(80);
    }

    function tokensToGenerate(uint256 _totalCollected, uint256 _exchangeRate, uint256 _toFund) public returns (uint256){
        uint256 collected = _totalCollected;
        uint256 totCollected = collected;
        collected = collected.sub(_toFund);

        uint256 tokensGenerated = _toFund.mul(_exchangeRate);
        uint256 tokensToBonusCap = 0;
        uint256 tokensToNextBonusCap = 0;
        uint256 bonusTokens = 0;

        if (collected < firstBonusCap) {
            if (collected.add(_toFund) < firstBonusCap) {
                tokensGenerated = tokensGenerated.add(tokensGenerated.percent(firstBonusPercent));
            }
            else {
                bonusTokens = firstBonusCap.sub(collected).percent(firstBonusPercent).mul(_exchangeRate);
                tokensToBonusCap = tokensGenerated.add(bonusTokens);
                tokensToNextBonusCap = totCollected.sub(firstBonusCap).percent(secondBonusPercent).mul(_exchangeRate);
                tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
            }
        }
        else if (collected < secondBonusCap) {
            if (collected.add(_toFund) < secondBonusCap) {
                tokensGenerated = tokensGenerated.add(tokensGenerated.percent(secondBonusPercent));
            }
            else {
                bonusTokens = secondBonusCap.sub(collected).percent(secondBonusPercent).mul(_exchangeRate);
                tokensToBonusCap = tokensGenerated.add(bonusTokens);
                tokensToNextBonusCap = totCollected.sub(secondBonusCap).percent(thirdBonusPercent).mul(_exchangeRate);
                tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
            }
        }
        else if (collected < thirdBonusCap) {
            if (collected.add(_toFund) < thirdBonusCap) {
                tokensGenerated = tokensGenerated.add(tokensGenerated.percent(thirdBonusPercent));
            }
            else {
                bonusTokens = thirdBonusCap.sub(collected).percent(thirdBonusPercent).mul(_exchangeRate);
                tokensToBonusCap = tokensGenerated.add(bonusTokens);
                tokensToNextBonusCap = totCollected.sub(thirdBonusCap).percent(fourthBonusPercent).mul(_exchangeRate);
                tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
            }
        }
        else if (collected < fourthBonusCap) {
            if (collected.add(_toFund) < fourthBonusCap) {
                tokensGenerated = tokensGenerated.add(tokensGenerated.percent(fourthBonusPercent));
            }
            else {
                bonusTokens = fourthBonusCap.sub(collected).percent(fourthBonusPercent).mul(_exchangeRate);
                tokensGenerated = tokensGenerated.add(bonusTokens);
            }
        }

        return tokensGenerated;
    }
}