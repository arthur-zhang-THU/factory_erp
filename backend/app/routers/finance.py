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
from app.models import FinanceInvoice, InvoiceType, InvoiceStatus
from app.schemas import InvoiceCreate, InvoiceResponse, InvoicePayment

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

# 5. 创建应收/应付单 (记账单，不影响余额)
@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(inv_in: InvoiceCreate, db: AsyncSession = Depends(get_db)):
    new_inv = FinanceInvoice(
        project_id=inv_in.project_id,
        title=inv_in.title,
        inv_type=inv_in.inv_type,
        total_amount=Decimal(str(inv_in.total_amount)),
        status=InvoiceStatus.UNPAID,
        due_date=inv_in.due_date
    )
    db.add(new_inv)
    await db.commit()
    await db.refresh(new_inv)
    
    # 重新加载 project
    stmt = select(FinanceInvoice).options(selectinload(FinanceInvoice.project)).where(FinanceInvoice.id == new_inv.id)
    result = await db.execute(stmt)
    return result.scalar()

# 6. 获取账单列表 (支持按状态筛选，比如只看 UNPAID)
@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(status: InvoiceStatus = None, db: AsyncSession = Depends(get_db)):
    stmt = select(FinanceInvoice).options(selectinload(FinanceInvoice.project)).order_by(desc(FinanceInvoice.due_date))
    if status:
        stmt = stmt.where(FinanceInvoice.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()

# 7. 核销/回款 (核心逻辑：还钱 -> 自动生成流水 -> 更新账单状态)
@router.post("/invoices/{inv_id}/pay")
async def pay_invoice(inv_id: int, pay_in: InvoicePayment, db: AsyncSession = Depends(get_db)):
    # A. 找账单
    invoice = await db.get(FinanceInvoice, inv_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="账单不存在")
        
    # B. 找资金账户
    account = await db.get(FinanceAccount, pay_in.account_id)
    if not account:
        raise HTTPException(status_code=404, detail="账户不存在")

    pay_amount = Decimal(str(pay_in.amount))

    # C. 检查金额是否超额 (选做，这里先不做严格限制，允许溢价还款)
    
    # D. 更新账单 (Paid Amount)
    invoice.paid_amount += pay_amount
    
    # E. 更新状态
    if invoice.paid_amount >= invoice.total_amount:
        invoice.status = InvoiceStatus.PAID
    else:
        invoice.status = InvoiceStatus.PARTIAL

    # F. 自动生成 FinanceTransaction (流水)
    # 如果是 应收(RECEIVABLE)，收钱=INCOME
    # 如果是 应付(PAYABLE)，付钱=EXPENSE
    txn_type = TransactionType.INCOME if invoice.inv_type == InvoiceType.RECEIVABLE else TransactionType.EXPENSE
    
    # 自动归类 (简单处理)
    category = FinanceCategory.SALES if txn_type == TransactionType.INCOME else FinanceCategory.PROCUREMENT

    new_txn = FinanceTransaction(
        account_id=account.id,
        project_id=invoice.project_id,
        txn_type=txn_type,
        category=category,
        amount=pay_amount,
        description=f"核销账单#{invoice.id}: {pay_in.description or invoice.title}",
        txn_date=pay_in.payment_date
    )
    
    # G. 更新账户余额
    if txn_type == TransactionType.INCOME:
        account.balance += pay_amount
    else:
        account.balance -= pay_amount

    db.add(new_txn)
    await db.commit()
    
    return {"message": "核销成功", "invoice_status": invoice.status, "new_balance": account.balance}