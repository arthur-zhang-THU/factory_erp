from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date
from decimal import Decimal  # 👈 Add this import!

from app.database import get_db
from app.models import FinanceAccount, FinanceTransaction, TransactionType, FinanceCategory
from app.schemas import FinanceAccountCreate, FinanceAccountResponse, TransactionCreate, TransactionResponse

router = APIRouter(
    prefix="/finance",
    tags=["财务管理 (Finance)"]
)

# ... (keep get_accounts and create_account as they are) ...

@router.get("/accounts", response_model=List[FinanceAccountResponse])
async def get_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FinanceAccount))
    return result.scalars().all()

@router.post("/accounts", response_model=FinanceAccountResponse)
async def create_account(account_in: FinanceAccountCreate, db: AsyncSession = Depends(get_db)):
    account = FinanceAccount(name=account_in.name, balance=account_in.initial_balance)
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account

# 3. 记一笔 (Core Function - Fixed)
@router.post("/transactions", response_model=TransactionResponse)
async def create_transaction(txn_in: TransactionCreate, db: AsyncSession = Depends(get_db)):
    # A. Find Account
    account = await db.get(FinanceAccount, txn_in.account_id)
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")
    
    # B. Update Balance (Convert float to Decimal first!)
    amount_decimal = Decimal(str(txn_in.amount))  # 👈 Convert here!
    
    if txn_in.txn_type == 'INCOME':
        account.balance += amount_decimal
    else:
        account.balance -= amount_decimal
        
    # C. Record Transaction
    new_txn = FinanceTransaction(
        account_id=txn_in.account_id,
        project_id=txn_in.project_id,
        txn_type=txn_in.txn_type,
        category=txn_in.category,
        amount=amount_decimal, # 👈 Use the decimal value
        description=txn_in.description,
        txn_date=txn_in.txn_date
    )
    
    db.add(new_txn)
    await db.commit()
    await db.refresh(new_txn)
    
    # D. Reload for response
    stmt = (
        select(FinanceTransaction)
        .options(selectinload(FinanceTransaction.account), selectinload(FinanceTransaction.project))
        .where(FinanceTransaction.id == new_txn.id)
    )
    result = await db.execute(stmt)
    final_txn = result.scalar()
    
    return TransactionResponse(
        id=final_txn.id,
        account_name=final_txn.account.name,
        project_name=final_txn.project.name if final_txn.project else None,
        txn_type=final_txn.txn_type,
        category=final_txn.category,
        amount=final_txn.amount,
        description=final_txn.description,
        txn_date=final_txn.txn_date
    )

# ... (keep list_transactions as is) ...
@router.get("/transactions", response_model=List[TransactionResponse])
async def list_transactions(project_id: int = None, limit: int = 50, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(FinanceTransaction)
        .options(selectinload(FinanceTransaction.account), selectinload(FinanceTransaction.project))
        .order_by(desc(FinanceTransaction.txn_date), desc(FinanceTransaction.id))
        .limit(limit)
    )
    
    if project_id:
        stmt = stmt.where(FinanceTransaction.project_id == project_id)
        
    result = await db.execute(stmt)
    txns = result.scalars().all()
    
    return [
        TransactionResponse(
            id=t.id,
            account_name=t.account.name,
            project_name=t.project.name if t.project else None,
            txn_type=t.txn_type,
            category=t.category,
            amount=t.amount,
            description=t.description,
            txn_date=t.txn_date
        )
        for t in txns
    ]