// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "../../contracts/InterestRateModel.sol";

/**
 * @title An Interest Rate Model for tests that can be instructed to return a failure instead of doing a calculation
 * @author Compound
 */
abstract contract InterestRateModelHarness is InterestRateModel {
    uint256 public constant opaqueBorrowFailureCode = 20;
    bool public failBorrowRate;
    uint256 public borrowRate;

    constructor(uint256 borrowRate_) {
        borrowRate = borrowRate_;
    }

    function setFailBorrowRate(bool failBorrowRate_) public {
        failBorrowRate = failBorrowRate_;
    }

    function setBorrowRate(uint256 borrowRate_) public {
        borrowRate = borrowRate_;
    }

    function getBorrowRate(uint256 utilizationRate) public view override returns (uint256) {
        utilizationRate; // unused
        require(!failBorrowRate, "INTEREST_RATE_MODEL_ERROR");
        return borrowRate;
    }
}
