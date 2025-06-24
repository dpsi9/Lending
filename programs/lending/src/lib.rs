use anchor_lang::prelude::*;

declare_id!("6BUoL9HNuSHtju5PyYvcpEZhs1KhGwF3nCxin3AG1NbF");

#[program]
pub mod lending {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
