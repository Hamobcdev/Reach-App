# contract.py

from pyteal import *

def approval_program():
    # Application global state
    balance_key = Bytes("balance")  # int
    limit_key = Bytes("limit")      # int
    owner_key = Bytes("owner")      # address

    on_create = Seq([
        App.globalPut(balance_key, Int(0)),
        App.globalPut(limit_key, Int(1000000)),  # 1 Algo limit
        App.globalPut(owner_key, Txn.sender()),
        Approve()
    ])

    on_fund = Seq([
        Assert(Txn.application_args.length() == Int(1)),
        App.globalPut(balance_key, App.globalGet(balance_key) + Btoi(Txn.application_args[0])),
        Approve()
    ])

    on_spend = Seq([
        Assert(Txn.application_args.length() == Int(1)),
        Assert(Txn.sender() == App.globalGet(owner_key)),
        Assert(App.globalGet(balance_key) >= Btoi(Txn.application_args[0])),
        Assert(Btoi(Txn.application_args[0]) <= App.globalGet(limit_key)),
        App.globalPut(balance_key, App.globalGet(balance_key) - Btoi(Txn.application_args[0])),
        Approve()
    ])

    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.NoOp, Cond(
            [Txn.application_args[0] == Bytes("fund"), on_fund],
            [Txn.application_args[0] == Bytes("spend"), on_spend],
        )]
    )

    return program

def clear_program():
    return Approve()
