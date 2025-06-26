# 🏦 Solana Lending Protocol (Educational Project)

This is a simple, educational **DeFi Lending Protocol** built on **Solana** using **Rust** and **Anchor Framework**.  
It covers core primitives of decentralized lending platforms like **Aave** or **Compound** — but built natively on-chain on Solana.

---

## 📌 Features Implemented

- ✅ Deposit  
- ✅ Withdraw  
- ✅ Borrow  
- ✅ Repay  
- ✅ Liquidation  
- ✅ Bank and User Account Initialization  
- ✅ Pyth Price Feed Integration (mocked for testing)  
- ✅ Full Integration Tests using **Anchor LiteSVM** (for fast, in-memory testing)

---

## 🧱 Program Architecture

### ✅ Accounts:

- **Bank:** Tracks global state for each token (deposits, borrows, interest rates, etc.)
- **User:** Tracks each user’s deposit and borrow positions (including shares and health factor)

### ✅ Token Vaults:

- **Treasury Token Accounts (PDAs):**  
  Hold actual tokens for each bank (protocol-controlled vaults)

### ✅ Instructions (Program Methods):

| Instruction | Purpose |
|---|---|
| `init_bank` | Initialize a Bank for a specific token mint |
| `init_user` | Initialize a user account |
| `deposit` | Deposit tokens into the protocol |
| `withdraw` | Withdraw user deposits |
| `borrow` | Borrow against deposited collateral |
| `repay` | Repay borrowed tokens |
| `liquidate` | Liquidate unhealthy positions based on health factor and oracle prices |

---

## 🧪 Testing

- ✅ Full **Mocha + Anchor + LiteSVM** test suite.
- ✅ Covers end-to-end flow:  
  **init → deposit → borrow → repay → withdraw → liquidate**
- ✅ Uses **mocked Pyth price feeds** for oracle-dependent logic.

Run tests:

```bash
anchor test --skip-build
```
Make sure LiteSVM is installed and configured for Anchor.

#📚 Tech Stack

Rust

Anchor Framework

Solana Program Library (SPL Token)

Pyth Oracles (Mocked)

Anchor LiteSVM (for fast local testing)

📂 Project Structure
```
LENDING/
├── programs/
│   └── lending/
│       └── src/
│           ├── instructions/
│           │   ├── admin.rs
│           │   ├── borrow.rs
│           │   ├── deposit.rs
│           │   ├── liquidate.rs
│           │   ├── repay.rs
│           │   └── withdraw.rs
│           ├── state.rs
│           ├── constants.rs
│           ├── error.rs
│           ├── lib.rs
│           └── mod.rs
├── tests/
│   └── lending.ts
├── Anchor.toml
├── Cargo.toml
├── package.json
└── ...
```
✅ Next Steps (Personal Learning Goals)

✅ Improve interest rate modeling (variable rate curves)

✅ Add real-time health factor tracking

✅ Integrate live Pyth price feeds (for testnet)


🚨 Disclaimer
This project is for educational purposes only. Not audited. Not production-ready.
There are unhandled edge cases, missing interest logic, and incomplete liquidation safety checks.
DO NOT deploy this to mainnet!

✅ License
MIT License (For educational use only)

✅ Author

Built by Dipendra Singh

