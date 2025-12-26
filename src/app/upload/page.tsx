'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/upload/file-uploader';
import { ParsedTransaction, SourceFile } from '@/lib/types';
import { BulkInsertResult, bulkInsertTransactions } from '@/lib/database';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatSource } from '@/lib/parser';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Upload as UploadIcon,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';

interface UploadResult extends BulkInsertResult {
  source: SourceFile;
}

export default function UploadPage() {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleUploadComplete = async (transactions: ParsedTransaction[], source: SourceFile) => {
    if (!isSupabaseConfigured()) {
      // Separate credits from debits in demo mode
      const debits = transactions.filter(tx => tx.type === 'debit');
      const credits = transactions.filter(tx => tx.type === 'credit');
      toast.success(`Parsed ${transactions.length} transactions (demo mode - not saved)`);
      setUploadResult({
        inserted: debits.length,
        duplicates: 0,
        credits: credits.length,
        insertedTransactions: debits,
        duplicateTransactions: [],
        creditTransactions: credits,
        source
      });
      return;
    }

    setIsImporting(true);
    try {
      const result = await bulkInsertTransactions(transactions, source);
      
      setUploadResult({ ...result, source });
      
      if (result.inserted > 0) {
        toast.success(`Imported ${result.inserted} new transactions`);
      }
      
      if (result.duplicates > 0) {
        toast.info(`Skipped ${result.duplicates} duplicate transactions`);
      }

      if (result.inserted === 0 && result.duplicates > 0) {
        toast.warning('All transactions already exist');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import transactions');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setUploadResult(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  // Show upload form if no results yet
  if (!uploadResult) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in">
        {!isSupabaseConfigured() && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800">Demo Mode</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Supabase is not configured. Files will be parsed but not saved. 
                    Connect to Supabase to persist your data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <FileUploader onUploadComplete={handleUploadComplete} isImporting={isImporting} />
      </div>
    );
  }

  // Show results
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="shadow-apple">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="text-lg font-semibold">{formatSource(uploadResult.source)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-apple border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expenses Added</p>
                <p className="text-2xl font-bold text-emerald-600">{uploadResult.inserted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-apple border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits Found</p>
                <p className="text-2xl font-bold text-blue-600">{uploadResult.credits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-apple border-amber-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <XCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duplicates Skipped</p>
                <p className="text-2xl font-bold text-amber-600">{uploadResult.duplicates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button onClick={() => router.push('/categorize')}>
          Go to Categorize
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <UploadIcon className="h-4 w-4 mr-2" />
          Upload Another File
        </Button>
      </div>

      {/* Added Expenses */}
      {uploadResult.insertedTransactions.length > 0 && (
        <Card className="shadow-apple">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Added Expenses ({uploadResult.insertedTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadResult.insertedTransactions.slice(0, 20).map((tx, index) => (
                  <TableRow key={index} className="bg-emerald-50/30">
                    <TableCell className="text-sm tabular-nums">
                      {format(tx.date, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-md">
                        {tx.description}
                      </p>
                      {tx.sub_description && (
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {tx.sub_description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums text-red-600">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {uploadResult.insertedTransactions.length > 20 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                      ... and {uploadResult.insertedTransactions.length - 20} more expenses
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Credits (Payments, Refunds, etc.) */}
      {uploadResult.creditTransactions.length > 0 && (
        <Card className="shadow-apple">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              Credits (Payments, Refunds) ({uploadResult.creditTransactions.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              These are saved separately and won&apos;t appear in categorization
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadResult.creditTransactions.slice(0, 10).map((tx, index) => (
                  <TableRow key={index} className="bg-blue-50/30">
                    <TableCell className="text-sm tabular-nums">
                      {format(tx.date, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-md">
                        {tx.description}
                      </p>
                      {tx.sub_description && (
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {tx.sub_description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums text-blue-600">
                      +{formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {uploadResult.creditTransactions.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                      ... and {uploadResult.creditTransactions.length - 10} more credits
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Transactions */}
      {uploadResult.duplicateTransactions.length > 0 && (
        <Card className="shadow-apple">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <XCircle className="h-5 w-5 text-amber-500" />
              Skipped Duplicates ({uploadResult.duplicateTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadResult.duplicateTransactions.slice(0, 10).map((tx, index) => (
                  <TableRow key={index} className="bg-amber-50/30">
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {format(tx.date, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {tx.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {uploadResult.duplicateTransactions.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-4">
                      ... and {uploadResult.duplicateTransactions.length - 10} more duplicates
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
