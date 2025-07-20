import type { ASTNode } from "./parser"

export interface Symbol {
  name: string
  type: string
  kind: "variable" | "function" | "parameter"
  line: number
  column: number
  parameters?: Symbol[]
  returnType?: string
}

export interface Scope {
  name: string
  symbols: { [key: string]: Symbol }
  parent?: Scope
}

export interface SymbolTable {
  scopes: { [key: string]: Scope }
  currentScope: string
}

export interface SemanticError {
  message: string
  line: number
  column: number
}

export class SemanticAnalyzer {
  private symbolTable: SymbolTable
  private errors: SemanticError[] = []
  private currentFunction: string | null = null

  constructor() {
    this.symbolTable = {
      scopes: {
        global: {
          name: "global",
          symbols: {},
        },
      },
      currentScope: "global",
    }
  }

  analyze(ast: ASTNode): { symbolTable: SymbolTable; errors: SemanticError[] } {
    this.visit(ast)
    return {
      symbolTable: this.symbolTable,
      errors: this.errors,
    }
  }

  private visit(node: ASTNode): string {
    switch (node.type) {
      case "Program":
        return this.visitProgram(node)
      case "FunctionDeclaration":
        return this.visitFunctionDeclaration(node)
      case "ParameterList":
        return this.visitParameterList(node)
      case "Parameter":
        return this.visitParameter(node)
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
        return this.visitIdentifier(node)
      case "IntegerLiteral":
        return "int"
      case "FloatLiteral":
        return "float"
      case "BooleanLiteral":
        return "bool"
      default:
        return "unknown"
    }
  }

  private visitProgram(node: ASTNode): string {
    if (node.children) {
      for (const child of node.children) {
        this.visit(child)
      }
    }
    return "void"
  }

  private visitFunctionDeclaration(node: ASTNode): string {
    const functionName = node.value!
    const returnType = node.dataType!

    // Check if function already exists
    if (this.symbolTable.scopes.global.symbols[functionName]) {
      this.addError(`Function '${functionName}' already declared`, node)
      return "void"
    }

    // Create function scope
    const scopeName = `function_${functionName}`
    this.symbolTable.scopes[scopeName] = {
      name: scopeName,
      symbols: {},
      parent: this.symbolTable.scopes.global,
    }

    // Add function to global scope
    const parameters: Symbol[] = []
    if (node.children && node.children[0].type === "ParameterList") {
      const paramList = node.children[0]
      if (paramList.children) {
        for (const param of paramList.children) {
          parameters.push({
            name: param.value!,
            type: param.dataType!,
            kind: "parameter",
            line: param.line!,
            column: param.column!,
          })
        }
      }
    }

    this.symbolTable.scopes.global.symbols[functionName] = {
      name: functionName,
      type: returnType,
      kind: "function",
      line: node.line!,
      column: node.column!,
      parameters,
      returnType,
    }

    // Enter function scope
    const previousScope = this.symbolTable.currentScope
    const previousFunction = this.currentFunction
    this.symbolTable.currentScope = scopeName
    this.currentFunction = functionName

    // Visit parameters and body
    if (node.children) {
      for (const child of node.children) {
        this.visit(child)
      }
    }

    // Exit function scope
    this.symbolTable.currentScope = previousScope
    this.currentFunction = previousFunction

    return "void"
  }

  private visitParameterList(node: ASTNode): string {
    if (node.children) {
      for (const child of node.children) {
        this.visit(child)
      }
    }
    return "void"
  }

  private visitParameter(node: ASTNode): string {
    const paramName = node.value!
    const paramType = node.dataType!

    // Add parameter to current scope
    const currentScope = this.symbolTable.scopes[this.symbolTable.currentScope]
    if (currentScope.symbols[paramName]) {
      this.addError(`Parameter '${paramName}' already declared`, node)
    } else {
      currentScope.symbols[paramName] = {
        name: paramName,
        type: paramType,
        kind: "parameter",
        line: node.line!,
        column: node.column!,
      }
    }

    return paramType
  }

  private visitBlock(node: ASTNode): string {
    if (node.children) {
      for (const child of node.children) {
        this.visit(child)
      }
    }
    return "void"
  }

  private visitVariableDeclaration(node: ASTNode): string {
    const varName = node.value!
    const varType = node.dataType!

    // Check if variable already exists in current scope
    const currentScope = this.symbolTable.scopes[this.symbolTable.currentScope]
    if (currentScope.symbols[varName]) {
      this.addError(`Variable '${varName}' already declared in this scope`, node)
    } else {
      currentScope.symbols[varName] = {
        name: varName,
        type: varType,
        kind: "variable",
        line: node.line!,
        column: node.column!,
      }
    }

    // Check initializer type compatibility
    if (node.children && node.children.length > 0) {
      const initType = this.visit(node.children[0])
      if (!this.isTypeCompatible(varType, initType)) {
        this.addError(`Cannot assign ${initType} to ${varType}`, node)
      }
    }

    return varType
  }

  private visitIfStatement(node: ASTNode): string {
    if (node.children && node.children.length > 0) {
      // Check condition type
      const conditionType = this.visit(node.children[0])
      if (conditionType !== "bool") {
        this.addError("If condition must be boolean", node.children[0])
      }

      // Visit then branch
      if (node.children.length > 1) {
        this.visit(node.children[1])
      }

      // Visit else branch if exists
      if (node.children.length > 2) {
        this.visit(node.children[2])
      }
    }
    return "void"
  }

  private visitWhileStatement(node: ASTNode): string {
    if (node.children && node.children.length > 0) {
      // Check condition type
      const conditionType = this.visit(node.children[0])
      if (conditionType !== "bool") {
        this.addError("While condition must be boolean", node.children[0])
      }

      // Visit body
      if (node.children.length > 1) {
        this.visit(node.children[1])
      }
    }
    return "void"
  }

  private visitReturnStatement(node: ASTNode): string {
    if (!this.currentFunction) {
      this.addError("Return statement outside function", node)
      return "void"
    }

    const functionSymbol = this.symbolTable.scopes.global.symbols[this.currentFunction]
    const expectedReturnType = functionSymbol.returnType!

    if (node.children && node.children.length > 0) {
      const returnType = this.visit(node.children[0])
      if (!this.isTypeCompatible(expectedReturnType, returnType)) {
        this.addError(`Function must return ${expectedReturnType}, got ${returnType}`, node)
      }
    } else if (expectedReturnType !== "void") {
      this.addError(`Function must return ${expectedReturnType}`, node)
    }

    return "void"
  }

  private visitExpressionStatement(node: ASTNode): string {
    if (node.children && node.children.length > 0) {
      return this.visit(node.children[0])
    }
    return "void"
  }

  private visitBinaryExpression(node: ASTNode): string {
    if (!node.children || node.children.length < 2) {
      return "unknown"
    }

    const leftType = this.visit(node.children[0])
    const rightType = this.visit(node.children[1])
    const operator = node.value!

    // Type checking for binary operations
    switch (operator) {
      case "+":
      case "-":
      case "*":
      case "/":
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return this.getResultType(leftType, rightType)
        } else {
          this.addError(`Arithmetic operation requires numeric types, got ${leftType} and ${rightType}`, node)
          return "unknown"
        }

      case "==":
      case "!=":
        if (this.isTypeCompatible(leftType, rightType)) {
          return "bool"
        } else {
          this.addError(`Comparison requires compatible types, got ${leftType} and ${rightType}`, node)
          return "bool"
        }

      case "<":
      case ">":
      case "<=":
      case ">=":
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return "bool"
        } else {
          this.addError(`Comparison requires numeric types, got ${leftType} and ${rightType}`, node)
          return "bool"
        }

      case "&&":
      case "||":
        if (leftType === "bool" && rightType === "bool") {
          return "bool"
        } else {
          this.addError(`Logical operation requires boolean types, got ${leftType} and ${rightType}`, node)
          return "bool"
        }

      default:
        this.addError(`Unknown binary operator: ${operator}`, node)
        return "unknown"
    }
  }

  private visitUnaryExpression(node: ASTNode): string {
    if (!node.children || node.children.length < 1) {
      return "unknown"
    }

    const operandType = this.visit(node.children[0])
    const operator = node.value!

    switch (operator) {
      case "-":
        if (this.isNumericType(operandType)) {
          return operandType
        } else {
          this.addError(`Unary minus requires numeric type, got ${operandType}`, node)
          return operandType
        }

      case "!":
        if (operandType === "bool") {
          return "bool"
        } else {
          this.addError(`Logical not requires boolean type, got ${operandType}`, node)
          return "bool"
        }

      default:
        this.addError(`Unknown unary operator: ${operator}`, node)
        return "unknown"
    }
  }

  private visitCallExpression(node: ASTNode): string {
    if (!node.children || node.children.length < 1) {
      return "unknown"
    }

    const callee = node.children[0]
    if (callee.type !== "Identifier") {
      this.addError("Can only call functions", node)
      return "unknown"
    }

    const functionName = callee.value!
    const functionSymbol = this.lookupSymbol(functionName)

    if (!functionSymbol) {
      this.addError(`Undefined function: ${functionName}`, callee)
      return "unknown"
    }

    if (functionSymbol.kind !== "function") {
      this.addError(`'${functionName}' is not a function`, callee)
      return "unknown"
    }

    // Check argument count and types
    const args = node.children.slice(1)
    const expectedParams = functionSymbol.parameters || []

    if (args.length !== expectedParams.length) {
      this.addError(`Function '${functionName}' expects ${expectedParams.length} arguments, got ${args.length}`, node)
    } else {
      for (let i = 0; i < args.length; i++) {
        const argType = this.visit(args[i])
        const expectedType = expectedParams[i].type
        if (!this.isTypeCompatible(expectedType, argType)) {
          this.addError(`Argument ${i + 1} to '${functionName}' must be ${expectedType}, got ${argType}`, args[i])
        }
      }
    }

    return functionSymbol.returnType || "void"
  }

  private visitIdentifier(node: ASTNode): string {
    const name = node.value!
    const symbol = this.lookupSymbol(name)

    if (!symbol) {
      this.addError(`Undefined identifier: ${name}`, node)
      return "unknown"
    }

    return symbol.type
  }

  private lookupSymbol(name: string): Symbol | null {
    // First check current scope
    const currentScope = this.symbolTable.scopes[this.symbolTable.currentScope]
    if (currentScope.symbols[name]) {
      return currentScope.symbols[name]
    }

    // Then check global scope
    if (this.symbolTable.scopes.global.symbols[name]) {
      return this.symbolTable.scopes.global.symbols[name]
    }

    return null
  }

  private isTypeCompatible(expected: string, actual: string): boolean {
    if (expected === actual) return true

    // Allow int to float conversion
    if (expected === "float" && actual === "int") return true

    return false
  }

  private isNumericType(type: string): boolean {
    return type === "int" || type === "float"
  }

  private getResultType(leftType: string, rightType: string): string {
    if (leftType === "float" || rightType === "float") {
      return "float"
    }
    return "int"
  }

  private addError(message: string, node: ASTNode): void {
    this.errors.push({
      message,
      line: node.line || 0,
      column: node.column || 0,
    })
  }
}
