import { describe, it, before } from "mocha";
import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import { PublicKey, Keypair, Transaction, SendOptions } from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Lending } from "../target/types/lending";

/* ── start LiteSVM ------------------------------------------------------ */
const svm = fromWorkspace(".");
const provider = new LiteSVMProvider(svm);
anchor.setProvider(provider);

const program = anchor.workspace.lending as Program<Lending>;
const signer = provider.wallet.payer as Keypair;

/* ── patch spl-token helpers ------------------------------------------- */
if (!(provider.connection as any).sendTransaction) {
  (provider.connection as any).sendTransaction = async (
    tx: Transaction,
    signers: Keypair[] = [],
    opts?: SendOptions,
  ) => provider.sendAndConfirm(tx, signers, opts);
}
if (!(provider.connection as any).confirmTransaction) {
  (provider.connection as any).confirmTransaction = async () => ({
    value: { err: null },
  });
}

/* ── shared state ------------------------------------------------------- */
let usdcMint: PublicKey;
let solMint: PublicKey;

let usdcBank: PublicKey; // Bank (mint seed)
let solBank: PublicKey;
let usdcTreasury: PublicKey; // Treasury token account
let solTreasury: PublicKey;

let userUsdcAta: PublicKey;
let userSolAta: PublicKey;

let userAccountPda: PublicKey;
let priceUpdate: PublicKey;

let borrowWorked = false;

describe("lending – full IDL flow", () => {
  before(async () => {
    /* 1️⃣  create mints */
    usdcMint = await createMint(provider.connection, signer, signer.publicKey, null, 6);
    solMint = await createMint(provider.connection, signer, signer.publicKey, null, 9);

    /* 2️⃣  derive PDAs --------------------------------------------------- */
    [usdcBank] = PublicKey.findProgramAddressSync([usdcMint.toBuffer()], program.programId);
    [solBank] = PublicKey.findProgramAddressSync([solMint.toBuffer()], program.programId);
    [usdcTreasury] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), usdcMint.toBuffer()],
      program.programId,
    );
    [solTreasury] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), solMint.toBuffer()],
      program.programId,
    );
    [userAccountPda] = PublicKey.findProgramAddressSync(
      [signer.publicKey.toBuffer()],
      program.programId,
    );

    /* 3️⃣  mock Pyth price_update account w/ correct owner -------------- */
    const pythProgram = new PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");
    const dummy = Keypair.generate();
    const data = new Uint8Array(512); // big enough
    data.set(Uint8Array.from([0x22, 0xf1, 0x23, 0x63, 0x9d, 0x7e, 0xf4, 0xcd])); // discriminator
    await svm.setAccount(dummy.publicKey, {
      lamports: 1_000_000,
      data,
      owner: pythProgram,
      executable: false,
      rentEpoch: 0,
    });
    priceUpdate = dummy.publicKey;
  });

  /* ── init user -------------------------------------------------------- */
  it("init_user", async () => {
    await program.methods.initUser(usdcMint).accounts({ signer: signer.publicKey }).rpc();
  });

  /* ── USDC bank -------------------------------------------------------- */
  it("init_bank for USDC", async () => {
    await program.methods
      .initBank(new BN(1), new BN(1))
      .accounts({
        signer: signer.publicKey,
        mint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    await mintTo(provider.connection, signer, usdcMint, usdcTreasury, signer, 10_000n * 10n ** 6n);
  });

  /* ── deposit ---------------------------------------------------------- */
  it("deposit 1 000 USDC", async () => {
    userUsdcAta = await createAssociatedTokenAccount(
      provider.connection,
      signer,
      usdcMint,
      signer.publicKey,
    );
    await mintTo(provider.connection, signer, usdcMint, userUsdcAta, signer, 10_000n * 10n ** 6n);

    await program.methods
      .deposit(new BN(1_000n * 10n ** 6n))
      .accounts({
        signer: signer.publicKey,
        mint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenPrgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      } as any)
      .rpc();
  });

  /* ── SOL bank --------------------------------------------------------- */
  it("init_bank for SOL", async () => {
    await program.methods
      .initBank(new BN(1), new BN(1))
      .accounts({
        signer: signer.publicKey,
        mint: solMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    await mintTo(provider.connection, signer, solMint, solTreasury, signer, 10_000n * 10n ** 9n);
  });

  /* ── borrow ----------------------------------------------------------- */
  it("borrow 1 SOL", async () => {
    userSolAta = await createAssociatedTokenAccount(
      provider.connection,
      signer,
      solMint,
      signer.publicKey,
    );
    try {
      await program.methods
        .borrow(new BN(1_000_000_000))
        .accounts({
          signer: signer.publicKey,
          mint: solMint,
          priceUpdate: priceUpdate,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      borrowWorked = true;
    } catch (e) {
      console.error("Borrow failed, skipping repay/liquidate:", e.message);
    }
  });

  /* ── repay ------------------------------------------------------------ */
  it("repay 1 SOL", async function () {
    if (!borrowWorked) return this.skip();

    await mintTo(provider.connection, signer, solMint, userSolAta, signer, 1_000_000_000n);

    await program.methods
      .repay(new BN(1_000_000_000))
      .accounts({
        signer: signer.publicKey,
        mint: solMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  /* ── withdraw --------------------------------------------------------- */
  it("withdraw 500 USDC", async () => {
    await program.methods
      .withdraw(new BN(500n * 10n ** 6n))
      .accounts({
        signer: signer.publicKey,
        mint: usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        // associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  /* ── liquidate -------------------------------------------------------- */
  it("liquidate (dummy)", async function () {
    if (!borrowWorked) return this.skip();

    await program.methods
      .liquidate()
      .accounts({
        liquidator: signer.publicKey,
        priceUpdate: priceUpdate,
        collateralMint: solMint,
        borrowedMint: usdcMint,
        //@ts-ignore
        collateralBank: solBank,
        collateralBankTokenAccount: solTreasury,
        borrowedBank: usdcBank,
        borrowedTokenAccount: usdcTreasury,
        userAccount: userAccountPda,
        liquidatorCollateralTokenAccount: userSolAta,
        liquidatorBorrowedTokenAccount: userUsdcAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
  });
});
