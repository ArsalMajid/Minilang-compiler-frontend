import type { Token } from "./lexical-analyzer"

export interface ASTNode {
  type: string
  value?: string
  children?: ASTNode[]
  dataType?: string
  line?: number
  column?: number
}

export interface ParseError {
  message: string
  line: number
  column: number
}

export class Parser {
  private tokens: Token[]
  private position = 0
  private errors: ParseError[] = []

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): { ast: ASTNode | null; errors: ParseError[] } {
    try {
      const ast = this.parseProgram()
      return { ast, errors: this.errors }
    } catch (error) {
      return { ast: null, errors: this.errors }
    }
  }

  private parseProgram(): ASTNode {
    const functions: ASTNode[] = []

    while (!this.isAtEnd() && this.peek().type !== "EOF") {
      try {
        const func = this.parseFunction()
        if (func) functions.push(func)
      } catch (error) {
        this.synchronize()
      }
    }

    return {
      type: "Program",
      children: functions,
    }
  }

  private parseFunction(): ASTNode {
    // Parse return type
    const returnType = this.consume("KEYWORD", "Expected return type")

    // Parse function name
    const name = this.consume("IDENTIFIER", "Expected function name")

    // Parse parameters
    this.consume("LEFT_PAREN", 'Expected "(" after function name')
    const parameters = this.parseParameterList()
    this.consume("RIGHT_PAREN", 'Expected ")" after parameters')

    // Parse function body
    const body = this.parseBlock()

    return {
      type: "FunctionDeclaration",
      value: name.value,
      dataType: returnType.value,
      children: [
        {
          type: "ParameterList",
          children: parameters,
        },
        body,
      ],
      line: returnType.line,
      column: returnType.column,
    }
  }

  private parseParameterList(): ASTNode[] {
    const parameters: ASTNode[] = []

    if (this.peek().type !== "RIGHT_PAREN") {
      do {
        const type = this.consume("KEYWORD", "Expected parameter type")
        const name = this.consume("IDENTIFIER", "Expected parameter name")

        parameters.push({
          type: "Parameter",
          value: name.value,
          dataType: type.value,
          line: type.line,
          column: type.column,
        })
      } while (this.match("COMMA"))
    }

    return parameters
  }

  private parseBlock(): ASTNode {
    this.consume("LEFT_BRACE", 'Expected "{"')
    const statements: ASTNode[] = []

    while (!this.check("RIGHT_BRACE") && !this.isAtEnd()) {
      try {
        const stmt = this.parseStatement()
        if (stmt) statements.push(stmt)
      } catch (error) {
        this.synchronize()
      }
    }

    this.consume("RIGHT_BRACE", 'Expected "}"')

    return {
      type: "Block",
      children: statements,
    }
  }

  private parseStatement(): ASTNode | null {
    if (this.match("KEYWORD")) {
      const keyword = this.previous()

      switch (keyword.value) {
        case "int":
        case "float":
        case "bool":
          return this.parseVariableDeclaration(keyword)
        case "if":
          return this.parseIfStatement()
        case "while":
          return this.parseWhileStatement()
        case "return":
          return this.parseReturnStatement()
        default:
          this.addError(`Unexpected keyword: ${keyword.value}`, keyword)
          return null
      }
    }

    // Expression statement or assignment
    const expr = this.parseExpression()
    this.consume("SEMICOLON", 'Expected ";" after expression')
    return {
      type: "ExpressionStatement",
      children: [expr],
    }
  }

  private parseVariableDeclaration(typeToken: Token): ASTNode {
    const name = this.consume("IDENTIFIER", "Expected variable name")
    let initializer: ASTNode | null = null

    if (this.match("ASSIGN")) {
      initializer = this.parseExpression()
    }

    this.consume("SEMICOLON", 'Expected ";" after variable declaration')

    return {
      type: "VariableDeclaration",
      value: name.value,
      dataType: typeToken.value,
      children: initializer ? [initializer] : [],
      line: typeToken.line,
      column: typeToken.column,
    }
  }

  private parseIfStatement(): ASTNode {
    this.consume("LEFT_PAREN", 'Expected "(" after "if"')
    const condition = this.parseExpression()
    this.consume("RIGHT_PAREN", 'Expected ")" after if condition')

    const thenBranch = this.parseBlock()
    let elseBranch: ASTNode | null = null

    if (this.match("KEYWORD") && this.previous().value === "else") {
      elseBranch = this.parseBlock()
    }

    return {
      type: "IfStatement",
      children: elseBranch ? [condition, thenBranch, elseBranch] : [condition, thenBranch],
    }
  }

  private parseWhileStatement(): ASTNode {
    this.consume("LEFT_PAREN", 'Expected "(" after "while"')
    const condition = this.parseExpression()
    this.consume("RIGHT_PAREN", 'Expected ")" after while condition')

    const body = this.parseBlock()

    return {
      type: "WhileStatement",
      children: [condition, body],
    }
  }

  private parseReturnStatement(): ASTNode {
    let value: ASTNode | null = null

    if (!this.check("SEMICOLON")) {
      value = this.parseExpression()
    }

    this.consume("SEMICOLON", 'Expected ";" after return value')

    return {
      type: "ReturnStatement",
      children: value ? [value] : [],
    }
  }

  private parseExpression(): ASTNode {
    return this.parseLogicalOr()
  }

  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd()

    while (this.match("LOGICAL_OR")) {
      const operator = this.previous()
      const right = this.parseLogicalAnd()
      expr = {
        type: "BinaryExpression",
        value: operator.value,
        children: [expr, right],
        line: operator.line,
        column: operator.column,
      }
    }

    return expr
  }

  private parseLogicalAnd(): ASTNode {
    let expr = this.parseEquality()

    while (this.match("LOGICAL_AND")) {
      const operator = this.previous()
      const right = this.parseEquality()
      expr = {
        type: "BinaryExpression",
        value: operator.value,
        children: [expr, right],
        line: operator.line,
        column: operator.column,
      }
    }

    return expr
  }

  private parseEquality(): ASTNode {
    let expr = this.parseComparison()

    while (this.match("EQUAL", "NOT_EQUAL")) {
      const operator = this.previous()
      const right = this.parseComparison()
      expr = {
        type: "BinaryExpression",
        value: operator.value,
        children: [expr, right],
        line: operator.line,
        column: operator.column,
      }
    }

    return expr
  }

  private parseComparison(): ASTNode {
    let expr = this.parseTerm()

    while (this.match("GREATER_THAN", "GREATER_EQUAL", "LESS_THAN", "LESS_EQUAL")) {
      const operator = this.previous()
      const right = this.parseTerm()
      expr = {
        type: "BinaryExpression",
        value: operator.value,
        children: [expr, right],
        line: operator.line,
        column: operator.column,
      }
    }

    return expr
  }

  private parseTerm(): ASTNode {
    let expr = this.parseFactor()

    while (this.match("MINUS", "PLUS")) {
      const operator = this.previous()
      const right = this.parseFactor()
      expr = {
        type: "BinaryExpression",
        value: operator.value,
        children: [expr, right],
        line: operator.line,
        column: operator.column,
      }
    }

    return expr
  }

  private parseFactor(): ASTNode {
    let expr = this.parseUnary()

    while (this.match("DIVIDE", "MULTIPLY")) {
      const operator = this.previous()
      const right = this.parseUnary()
      expr = {
        type: "BinaryExpression",
        value: operator.value,
        children: [expr, right],
        line: operator.line,
        column: operator.column,
      }
    }

    return expr
  }

  private parseUnary(): ASTNode {
    if (this.match("LOGICAL_NOT", "MINUS")) {
      const operator = this.previous()
      const right = this.parseUnary()
      return {
        type: "UnaryExpression",
        value: operator.value,
        children: [right],
        line: operator.line,
        column: operator.column,
      }
    }

    return this.parseCall()
  }

  private parseCall(): ASTNode {
    let expr = this.parsePrimary()

    while (true) {
      if (this.match("LEFT_PAREN")) {
        expr = this.finishCall(expr)
      } else {
        break
      }
    }

    return expr
  }

  private finishCall(callee: ASTNode): ASTNode {
    const args: ASTNode[] = []

    if (!this.check("RIGHT_PAREN")) {
      do {
        args.push(this.parseExpression())
      } while (this.match("COMMA"))
    }

    this.consume("RIGHT_PAREN", 'Expected ")" after arguments')

    return {
      type: "CallExpression",
      children: [callee, ...args],
      line: callee.line,
      column: callee.column,
    }
  }

  private parsePrimary(): ASTNode {
    if (this.match("KEYWORD")) {
      const keyword = this.previous()
      if (keyword.value === "true" || keyword.value === "false") {
        return {
          type: "BooleanLiteral",
          value: keyword.value,
          line: keyword.line,
          column: keyword.column,
        }
      }
    }

    if (this.match("INT_LITERAL")) {
      const token = this.previous()
      return {
        type: "IntegerLiteral",
        value: token.value,
        line: token.line,
        column: token.column,
      }
    }

    if (this.match("FLOAT_LITERAL")) {
      const token = this.previous()
      return {
        type: "FloatLiteral",
        value: token.value,
        line: token.line,
        column: token.column,
      }
    }

    if (this.match("IDENTIFIER")) {
      const token = this.previous()
      return {
        type: "Identifier",
        value: token.value,
        line: token.line,
        column: token.column,
      }
    }

    if (this.match("LEFT_PAREN")) {
      const expr = this.parseExpression()
      this.consume("RIGHT_PAREN", 'Expected ")" after expression')
      return expr
    }

    const token = this.peek()
    this.addError("Expected expression", token)
    throw new Error("Parse error")
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type === type
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++
    return this.previous()
  }

  private isAtEnd(): boolean {
    return this.position >= this.tokens.length || this.peek().type === "EOF"
  }

  private peek(): Token {
    return this.tokens[this.position] || { type: "EOF", value: "", line: 0, column: 0 }
  }

  private previous(): Token {
    return this.tokens[this.position - 1]
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) return this.advance()

    const token = this.peek()
    this.addError(message, token)
    throw new Error("Parse error")
  }

  private addError(message: string, token: Token): void {
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
    })
  }

  private synchronize(): void {
    this.advance()

    while (!this.isAtEnd()) {
      if (this.previous().type === "SEMICOLON") return

      switch (this.peek().type) {
        case "KEYWORD":
          const keyword = this.peek().value
          if (["int", "float", "bool", "if", "while", "return"].includes(keyword)) {
            return
          }
          break
      }

      this.advance()
    }
  }
}
