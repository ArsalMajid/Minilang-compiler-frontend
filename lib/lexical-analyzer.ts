export interface Token {
  type: string
  value: string
  line: number
  column: number
}

export interface LexicalError {
  message: string
  line: number
  column: number
}

export class LexicalAnalyzer {
  private source: string
  private position = 0
  private line = 1
  private column = 1
  private tokens: Token[] = []
  private errors: LexicalError[] = []

  private keywords = new Set(["int", "float", "bool", "if", "else", "while", "return", "true", "false"])

  private operators = new Map([
    ["+", "PLUS"],
    ["-", "MINUS"],
    ["*", "MULTIPLY"],
    ["/", "DIVIDE"],
    ["=", "ASSIGN"],
    ["==", "EQUAL"],
    ["!=", "NOT_EQUAL"],
    ["<", "LESS_THAN"],
    [">", "GREATER_THAN"],
    ["<=", "LESS_EQUAL"],
    [">=", "GREATER_EQUAL"],
    ["&&", "LOGICAL_AND"],
    ["||", "LOGICAL_OR"],
    ["!", "LOGICAL_NOT"],
  ])

  private delimiters = new Map([
    ["(", "LEFT_PAREN"],
    [")", "RIGHT_PAREN"],
    ["{", "LEFT_BRACE"],
    ["}", "RIGHT_BRACE"],
    [";", "SEMICOLON"],
    [",", "COMMA"],
  ])

  constructor(source: string) {
    this.source = source
  }

  tokenize(): { tokens: Token[]; errors: LexicalError[] } {
    while (this.position < this.source.length) {
      this.skipWhitespace()

      if (this.position >= this.source.length) break

      const char = this.source[this.position]

      if (this.isLetter(char) || char === "_") {
        this.readIdentifierOrKeyword()
      } else if (this.isDigit(char)) {
        this.readNumber()
      } else if (this.isOperatorStart(char)) {
        this.readOperator()
      } else if (this.delimiters.has(char)) {
        this.addToken(this.delimiters.get(char)!, char)
        this.advance()
      } else {
        this.addError(`Invalid character: ${char}`)
        this.advance()
      }
    }

    this.addToken("EOF", "")
    return { tokens: this.tokens, errors: this.errors }
  }

  private skipWhitespace(): void {
    while (this.position < this.source.length) {
      const char = this.source[this.position]
      if (char === " " || char === "\t" || char === "\r") {
        this.advance()
      } else if (char === "\n") {
        this.line++
        this.column = 1
        this.position++
      } else {
        break
      }
    }
  }

  private readIdentifierOrKeyword(): void {
    const start = this.position
    const startColumn = this.column

    while (
      this.position < this.source.length &&
      (this.isLetter(this.source[this.position]) ||
        this.isDigit(this.source[this.position]) ||
        this.source[this.position] === "_")
    ) {
      this.advance()
    }

    const value = this.source.substring(start, this.position)
    const type = this.keywords.has(value) ? "KEYWORD" : "IDENTIFIER"

    this.tokens.push({
      type,
      value,
      line: this.line,
      column: startColumn,
    })
  }

  private readNumber(): void {
    const start = this.position
    const startColumn = this.column
    let isFloat = false

    while (this.position < this.source.length && this.isDigit(this.source[this.position])) {
      this.advance()
    }

    if (this.position < this.source.length && this.source[this.position] === ".") {
      isFloat = true
      this.advance()

      while (this.position < this.source.length && this.isDigit(this.source[this.position])) {
        this.advance()
      }
    }

    const value = this.source.substring(start, this.position)
    this.tokens.push({
      type: isFloat ? "FLOAT_LITERAL" : "INT_LITERAL",
      value,
      line: this.line,
      column: startColumn,
    })
  }

  private readOperator(): void {
    const startColumn = this.column
    const operator = this.source[this.position]

    // Check for two-character operators
    if (this.position + 1 < this.source.length) {
      const twoChar = operator + this.source[this.position + 1]
      if (this.operators.has(twoChar)) {
        this.advance()
        this.advance()
        this.tokens.push({
          type: this.operators.get(twoChar)!,
          value: twoChar,
          line: this.line,
          column: startColumn,
        })
        return
      }
    }

    // Single character operator
    if (this.operators.has(operator)) {
      this.advance()
      this.tokens.push({
        type: this.operators.get(operator)!,
        value: operator,
        line: this.line,
        column: startColumn,
      })
    } else {
      this.addError(`Invalid operator: ${operator}`)
      this.advance()
    }
  }

  private isLetter(char: string): boolean {
    return /[a-zA-Z]/.test(char)
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char)
  }

  private isOperatorStart(char: string): boolean {
    return "+-*/=!<>&|".includes(char)
  }

  private advance(): void {
    this.position++
    this.column++
  }

  private addToken(type: string, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column,
    })
  }

  private addError(message: string): void {
    this.errors.push({
      message,
      line: this.line,
      column: this.column,
    })
  }
}
