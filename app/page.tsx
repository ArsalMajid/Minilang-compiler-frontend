"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Play, FileText, Code, CheckCircle, AlertCircle } from "lucide-react"
import { LexicalAnalyzer } from "@/lib/lexical-analyzer"
import { Parser } from "@/lib/parser"
import { SemanticAnalyzer } from "@/lib/semantic-analyzer"
import { IntermediateCodeGenerator } from "@/lib/intermediate-code-generator"

const sampleCode = `int max(int a, int b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

int main() {
    int x = 10;
    int y = 20;
    int z = max(x, y);
    return 0;
}`

export default function MiniLangCompiler() {
  const [sourceCode, setSourceCode] = useState(sampleCode)
  const [tokens, setTokens] = useState<any[]>([])
  const [ast, setAst] = useState<any>(null)
  const [symbolTable, setSymbolTable] = useState<any>(null)
  const [semanticErrors, setSemanticErrors] = useState<any[]>([])
  const [intermediateCode, setIntermediateCode] = useState<string[]>([])
  const [lexicalErrors, setLexicalErrors] = useState<any[]>([])
  const [syntaxErrors, setSyntaxErrors] = useState<any[]>([])
  const [isCompiling, setIsCompiling] = useState(false)

  const compile = async () => {
    setIsCompiling(true)

    try {
      // Phase 1: Lexical Analysis
      const lexer = new LexicalAnalyzer(sourceCode)
      const lexResult = lexer.tokenize()
      setTokens(lexResult.tokens)
      setLexicalErrors(lexResult.errors)

      if (lexResult.errors.length === 0) {
        // Phase 2: Syntax Analysis
        const parser = new Parser(lexResult.tokens)
        const parseResult = parser.parse()
        setAst(parseResult.ast)
        setSyntaxErrors(parseResult.errors)

        if (parseResult.errors.length === 0 && parseResult.ast) {
          // Phase 3: Semantic Analysis
          const semanticAnalyzer = new SemanticAnalyzer()
          const semanticResult = semanticAnalyzer.analyze(parseResult.ast)
          setSymbolTable(semanticResult.symbolTable)
          setSemanticErrors(semanticResult.errors)

          // Phase 4: Intermediate Code Generation (Optional)
          if (semanticResult.errors.length === 0) {
            const codeGen = new IntermediateCodeGenerator()
            const tacCode = codeGen.generate(parseResult.ast, semanticResult.symbolTable)
            setIntermediateCode(tacCode)
          }
        }
      }
    } catch (error) {
      console.error("Compilation error:", error)
    }

    setIsCompiling(false)
  }

  const renderTokens = () => (
    <div className="space-y-2">
      {tokens.map((token, index) => (
        <div key={index} className="flex items-center gap-2">
          <Badge variant="outline">{token.type}</Badge>
          <span className="font-mono text-sm">{token.value}</span>
          <span className="text-xs text-muted-foreground">
            Line {token.line}, Col {token.column}
          </span>
        </div>
      ))}
    </div>
  )

  const renderAST = (node: any, depth = 0) => {
    if (!node) return null

    return (
      <div className={`ml-${depth * 4} border-l pl-2 my-1`}>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{node.type}</Badge>
          {node.value && <span className="font-mono text-sm">{node.value}</span>}
        </div>
        {node.children &&
          node.children.map((child: any, index: number) => <div key={index}>{renderAST(child, depth + 1)}</div>)}
      </div>
    )
  }

  const renderSymbolTable = () => (
    <div className="space-y-4">
      {symbolTable &&
        Object.entries(symbolTable.scopes).map(([scopeName, scope]: [string, any]) => (
          <div key={scopeName} className="border rounded p-3">
            <h4 className="font-semibold mb-2">Scope: {scopeName}</h4>
            <div className="space-y-1">
              {Object.entries(scope.symbols).map(([name, symbol]: [string, any]) => (
                <div key={name} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{symbol.type}</Badge>
                  <span className="font-mono">{name}</span>
                  {symbol.kind && <span className="text-muted-foreground">({symbol.kind})</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )

  const renderErrors = (errors: any[], title: string) => (
    <div className="space-y-2">
      <h4 className="font-semibold text-red-600">{title}</h4>
      {errors.length === 0 ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>No errors found</span>
        </div>
      ) : (
        errors.map((error, index) => (
          <Alert key={index} variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Line {error.line}, Col {error.column}: {error.message}
            </AlertDescription>
          </Alert>
        ))
      )}
    </div>
  )

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">MiniLang++ Compiler</h1>
        <p className="text-muted-foreground">
          A complete front-end compiler implementation with lexical analysis, parsing, semantic analysis, and
          intermediate code generation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Source Code Editor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="Enter your MiniLang++ code here..."
            />
            <div className="mt-4">
              <Button onClick={compile} disabled={isCompiling} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                {isCompiling ? "Compiling..." : "Compile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Compilation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tokens" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="ast">AST</TabsTrigger>
                <TabsTrigger value="symbols">Symbols</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
                <TabsTrigger value="tac">TAC</TabsTrigger>
              </TabsList>

              <TabsContent value="tokens" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto">
                  {tokens.length > 0 ? (
                    renderTokens()
                  ) : (
                    <p className="text-muted-foreground">No tokens generated yet. Click compile to analyze.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ast" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto">
                  {ast ? (
                    renderAST(ast)
                  ) : (
                    <p className="text-muted-foreground">No AST generated yet. Click compile to parse.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="symbols" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto">
                  {symbolTable ? (
                    renderSymbolTable()
                  ) : (
                    <p className="text-muted-foreground">No symbol table generated yet. Click compile to analyze.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="errors" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto space-y-4">
                  {renderErrors(lexicalErrors, "Lexical Errors")}
                  <Separator />
                  {renderErrors(syntaxErrors, "Syntax Errors")}
                  <Separator />
                  {renderErrors(semanticErrors, "Semantic Errors")}
                </div>
              </TabsContent>

              <TabsContent value="tac" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto">
                  {intermediateCode.length > 0 ? (
                    <div className="space-y-1">
                      {intermediateCode.map((instruction, index) => (
                        <div key={index} className="font-mono text-sm bg-muted p-2 rounded">
                          {instruction}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No intermediate code generated yet. Fix all errors first.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Language Specification */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>MiniLang++ Language Specification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Data Types</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>int - Integer numbers</li>
                <li>float - Floating point numbers</li>
                <li>bool - Boolean values (true/false)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Control Structures</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>if-else statements</li>
                <li>while loops</li>
                <li>Function declarations and calls</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Operators</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Arithmetic: +, -, *, /</li>
                <li>
                  Comparison: ==, !=, {"<"}, {">"}, {"<="}, {">="}
                </li>
                <li>Logical: &&, ||, !</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Features</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Scoped symbol tables</li>
                <li>Type checking</li>
                <li>Function parameter validation</li>
                <li>Error recovery and reporting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
