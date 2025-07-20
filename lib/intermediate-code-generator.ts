import type { ASTNode } from "./parser"
import type { SymbolTable } from "./semantic-analyzer"

export class IntermediateCodeGenerator {
  private code: string[] = []
  private tempCounter = 0
  private labelCounter = 0

  generate(ast: ASTNode, symbolTable: SymbolTable): string[] {
    this.code = []
    this.tempCounter = 0
    this.labelCounter = 0

    this.visit(ast)
    return this.code
  }

  private visit(node: ASTNode): string {
    switch (node.type) {
      case "Program":
        return this.visitProgram(node)
      case "FunctionDeclaration":
        return this.visitFunctionDeclaration(node)
      case "Block":
        return this.visitBlock(node)
      case "VariableDeclaration":
        return this.visitVariableDeclaration(node)
      case "IfStatement":
        return this.visitIfStatement(node)
      case "WhileStatement":
        return this.visitWhileStatement(node)
      case "ReturnStatement":
        return this.visitReturnStatement(node)
      case "ExpressionStatement":
        return this.visitExpressionStatement(node)
      case "BinaryExpression":
        return this.visitBinaryExpression(node)
      case "UnaryExpression":
        return this.visitUnaryExpression(node)
      case "CallExpression":
        return this.visitCallExpression(node)
      case "Identifier":
        return node.value!
      case "IntegerLiteral":
      case "FloatLiteral":
      case "BooleanLiteral":
        return node.value!
      default:
        return ""
    }
  }

  private visitProgram(node: ASTNode): string {
    if (node.children) {
      for (const child of node.children) {
        this.visit(child)
      }
    }
    return ""
  }

  private visitFunctionDeclaration(node: ASTNode): string {
    const functionName = node.value!
    this.emit(`FUNCTION ${functionName}:`)

    if (node.children) {
      for (const child of node.children) {
        if (child.type === "Block") {
          this.visit(child)
        }
      }
    }

    this.emit(`END_FUNCTION ${functionName}`)
    return ""
  }

  private visitBlock(node: ASTNode): string {
    if (node.children) {
      for (const child of node.children) {
        this.visit(child)
      }
    }
    return ""
  }

  private visitVariableDeclaration(node: ASTNode): string {
    const varName = node.value!

    if (node.children && node.children.length > 0) {
      const initValue = this.visit(node.children[0])
      this.emit(`${varName} = ${initValue}`)
    } else {
      this.emit(`DECLARE ${varName}`)
    }

    return varName
  }

  private visitIfStatement(node: ASTNode): string {
    if (!node.children || node.children.length < 2) return ""

    const condition = this.visit(node.children[0])
    const elseLabel = this.newLabel()
    const endLabel = this.newLabel()

    this.emit(`IF_FALSE ${condition} GOTO ${elseLabel}`)
    this.visit(node.children[1]) // then branch

    if (node.children.length > 2) {
      this.emit(`GOTO ${endLabel}`)
      this.emit(`${elseLabel}:`)
      this.visit(node.children[2]) // else branch
      this.emit(`${endLabel}:`)
    } else {
      this.emit(`${elseLabel}:`)
    }

    return ""
  }

  private visitWhileStatement(node: ASTNode): string {
    if (!node.children || node.children.length < 2) return ""

    const startLabel = this.newLabel()
    const endLabel = this.newLabel()

    this.emit(`${startLabel}:`)
    const condition = this.visit(node.children[0])
    this.emit(`IF_FALSE ${condition} GOTO ${endLabel}`)
    this.visit(node.children[1]) // body
    this.emit(`GOTO ${startLabel}`)
    this.emit(`${endLabel}:`)

    return ""
  }

  private visitReturnStatement(node: ASTNode): string {
    if (node.children && node.children.length > 0) {
      const returnValue = this.visit(node.children[0])
      this.emit(`RETURN ${returnValue}`)
    } else {
      this.emit("RETURN")
    }
    return ""
  }

  private visitExpressionStatement(node: ASTNode): string {
    if (node.children && node.children.length > 0) {
      return this.visit(node.children[0])
    }
    return ""
  }

  private visitBinaryExpression(node: ASTNode): string {
    if (!node.children || node.children.length < 2) return ""

    const left = this.visit(node.children[0])
    const right = this.visit(node.children[1])
    const temp = this.newTemp()
    const operator = node.value!

    this.emit(`${temp} = ${left} ${operator} ${right}`)
    return temp
  }

  private visitUnaryExpression(node: ASTNode): string {
    if (!node.children || node.children.length < 1) return ""

    const operand = this.visit(node.children[0])
    const temp = this.newTemp()
    const operator = node.value!

    this.emit(`${temp} = ${operator}${operand}`)
    return temp
  }

  private visitCallExpression(node: ASTNode): string {
    if (!node.children || node.children.length < 1) return ""

    const callee = node.children[0]
    const functionName = callee.value!
    const args = node.children.slice(1)

    // Generate code for arguments
    const argTemps = args.map((arg) => this.visit(arg))

    // Push arguments
    for (const argTemp of argTemps) {
      this.emit(`PARAM ${argTemp}`)
    }

    // Call function
    const temp = this.newTemp()
    this.emit(`${temp} = CALL ${functionName}, ${argTemps.length}`)

    return temp
  }

  private emit(instruction: string): void {
    this.code.push(instruction)
  }

  private newTemp(): string {
    return `t${this.tempCounter++}`
  }

  private newLabel(): string {
    return `L${this.labelCounter++}`
  }
}
