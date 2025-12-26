'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SourceFile, ParsedTransaction } from '@/lib/types';
import { parseExcelFile, detectFileType, formatSource } from '@/lib/parser';

interface FileUploaderProps {
  onUploadComplete: (transactions: ParsedTransaction[], source: SourceFile) => void;
  isImporting?: boolean;
}

export function FileUploader({ onUploadComplete, isImporting = false }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<SourceFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[] | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setParsedTransactions(null);
    
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx', 'csv'].includes(ext || '')) {
      setError('Please upload an Excel file (.xls or .xlsx)');
      return;
    }

    setSelectedFile(file);
    
    // Try to auto-detect file type
    const detected = detectFileType(file.name);
    if (detected) {
      setFileType(detected);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleProcess = async () => {
    if (!selectedFile || !fileType) return;

    setIsProcessing(true);
    setError(null);
    setProgress(10);

    try {
      setProgress(30);
      const transactions = await parseExcelFile(selectedFile, fileType);
      setProgress(80);
      
      if (transactions.length === 0) {
        setError('No transactions found in the file');
        return;
      }

      setProgress(100);
      setParsedTransactions(transactions);
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (parsedTransactions && fileType) {
      onUploadComplete(parsedTransactions, fileType);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileType(null);
    setError(null);
    setParsedTransactions(null);
    setProgress(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      {!parsedTransactions && (
        <Card className="shadow-apple">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50',
                selectedFile && 'border-emerald-500 bg-emerald-50'
              )}
            >
              <input {...getInputProps()} />
              
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground mb-1">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop your statement'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse • Supports .xls, .xlsx, and .csv
                  </p>
                </>
              )}
            </div>

            {/* File Type Selection */}
            {selectedFile && !parsedTransactions && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Statement Type</label>
                  <Select
                    value={fileType || undefined}
                    onValueChange={(value) => setFileType(value as SourceFile)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select statement type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amex">American Express</SelectItem>
                      <SelectItem value="scotia_visa">Scotia Visa</SelectItem>
                      <SelectItem value="scotia_chequing">Scotia Chequing</SelectItem>
                      <SelectItem value="pc">PC Financial Mastercard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Processing file...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!fileType || isProcessing}
                  onClick={handleProcess}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Parse File'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Results */}
      {parsedTransactions && (
        <Card className="shadow-apple">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                File Parsed Successfully
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {parsedTransactions.length} transactions found from {fileType && formatSource(fileType)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Upload Another
            </Button>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">
                  {parsedTransactions.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    parsedTransactions
                      .filter(t => t.type === 'debit')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(
                    parsedTransactions
                      .filter(t => t.type === 'credit')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Credits</p>
              </div>
            </div>

            {/* Expenses Preview Table */}
            {parsedTransactions.filter(t => t.type === 'debit').length > 0 && (
              <div className="border rounded-lg overflow-hidden mb-4">
                <div className="px-4 py-2 bg-red-50 border-b">
                  <span className="font-medium text-red-700">
                    Expenses ({parsedTransactions.filter(t => t.type === 'debit').length})
                  </span>
                </div>
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Description</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTransactions
                        .filter(t => t.type === 'debit')
                        .slice(0, 15)
                        .map((tx, index) => (
                        <tr key={index} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-2 tabular-nums">
                            {tx.date.toLocaleDateString('en-CA')}
                          </td>
                          <td className="px-4 py-2 max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium text-red-600">
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedTransactions.filter(t => t.type === 'debit').length > 15 && (
                  <div className="px-4 py-2 bg-muted/30 text-center text-sm text-muted-foreground border-t">
                    Showing 15 of {parsedTransactions.filter(t => t.type === 'debit').length} expenses
                  </div>
                )}
              </div>
            )}

            {/* Credits Preview Table */}
            {parsedTransactions.filter(t => t.type === 'credit').length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-blue-50 border-b">
                  <span className="font-medium text-blue-700">
                    Credits / Payments ({parsedTransactions.filter(t => t.type === 'credit').length})
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    Won&apos;t appear in categorization
                  </span>
                </div>
                <div className="max-h-40 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                        <th className="px-4 py-2 text-left font-medium">Description</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTransactions
                        .filter(t => t.type === 'credit')
                        .slice(0, 10)
                        .map((tx, index) => (
                        <tr key={index} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-2 tabular-nums">
                            {tx.date.toLocaleDateString('en-CA')}
                          </td>
                          <td className="px-4 py-2 max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium text-blue-600">
                            +{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedTransactions.filter(t => t.type === 'credit').length > 10 && (
                  <div className="px-4 py-2 bg-muted/30 text-center text-sm text-muted-foreground border-t">
                    Showing 10 of {parsedTransactions.filter(t => t.type === 'credit').length} credits
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleReset} className="flex-1" disabled={isImporting}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="flex-1" disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing to Supabase...
                  </>
                ) : (
                  `Import ${parsedTransactions.length} Transactions`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported Formats */}
      <Card className="shadow-apple">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Supported Formats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-1">American Express</h4>
              <p className="text-sm text-muted-foreground">Summary.xls files</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-1">Scotia Visa</h4>
              <p className="text-sm text-muted-foreground">Scene_Visa_card_*.xlsx files</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-1">Scotia Chequing</h4>
              <p className="text-sm text-muted-foreground">Preferred_Package_*.xlsx files</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-1">PC Financial</h4>
              <p className="text-sm text-muted-foreground">CSV export files</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

