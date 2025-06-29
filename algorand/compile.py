
from pyteal import compileTeal, Mode

from contract import approval_program, clear_program

with open("approval.teal", "w") as f:
    compiled = compileTeal(approval_program(), mode=Mode.Application, version=6)
    f.write(compiled)

with open("clear.teal", "w") as f:
    compiled = compileTeal(clear_program(), mode=Mode.Application, version=6)
    f.write(compiled)
