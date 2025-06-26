use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Borrowed amount exceeds the maximum LTV")]
    OverLTV,
    #[msg("Insufficient funds to withdraw")]
    InsufficientFunds,
    #[msg("Attempting to borrow more than allowed")]
    OverBorrowableAmount,
    #[msg("Attempting to repay more than borrowed")]
    OverRepay,
    #[msg("User is not under collateralized")]
    NotUnderCollateralized,
}
