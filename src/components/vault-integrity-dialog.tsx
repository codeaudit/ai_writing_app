"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, Info, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface IntegrityCheckResult {
  documentsChecked: number;
  foldersChecked: number;
  compositionsChecked: number;
  duplicateIdsFixed: number;
  missingMetadataFixed: number;
  invalidDatesFixed: number;
  orphanedDocumentsFixed: number;
  orphanedFoldersFixed: number;
  brokenContextReferencesFixed: number;
  compositionFrontmatterFixed: number;
  details: string[];
}

interface VaultIntegrityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function VaultIntegrityDialog({
  open,
  onOpenChange,
  onComplete,
}: VaultIntegrityDialogProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<IntegrityCheckResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runIntegrityCheck = async () => {
    setIsChecking(true);
    setResult(null);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/vault/integrity');
      
      // Parse the response as JSON
      const data = await response.json();
      
      if (!response.ok) {
        // Handle error response
        const errorMsg = data.message || 'Failed to check vault integrity';
        setErrorMessage(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Set the result data
      setResult(data);
      
      // Show a toast notification with the summary
      const totalIssuesFixed = 
        data.duplicateIdsFixed + 
        data.missingMetadataFixed + 
        data.invalidDatesFixed + 
        data.orphanedDocumentsFixed + 
        data.orphanedFoldersFixed + 
        data.brokenContextReferencesFixed + 
        (data.compositionFrontmatterFixed || 0);
      
      if (totalIssuesFixed > 0) {
        toast({
          title: "Vault integrity check completed",
          description: `Fixed ${totalIssuesFixed} issues in your vault.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Vault integrity check completed",
          description: "No issues found in your vault.",
          variant: "default",
        });
      }
      
      // Notify parent component that check is complete
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error running vault integrity check:', error);
      
      // Set error message for display in the UI
      if (!errorMessage) {
        setErrorMessage((error as Error).message || 'Unknown error occurred');
      }
      
      toast({
        title: "Error",
        description: `Failed to check vault integrity: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getTotalIssuesFixed = (): number => {
    if (!result) return 0;
    
    return (
      result.duplicateIdsFixed + 
      result.missingMetadataFixed + 
      result.invalidDatesFixed + 
      result.orphanedDocumentsFixed + 
      result.orphanedFoldersFixed + 
      result.brokenContextReferencesFixed + 
      result.compositionFrontmatterFixed
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Vault Integrity Check</DialogTitle>
          <DialogDescription>
            This tool scans your vault for inconsistencies in metadata and fixes any issues found.
          </DialogDescription>
        </DialogHeader>
        
        {!isChecking && !result && (
          <div className="py-6">
            <p className="mb-4">
              The integrity check will look for and fix the following issues:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Missing or duplicate document and folder IDs</li>
              <li>Missing or invalid metadata</li>
              <li>Invalid dates</li>
              <li>Orphaned documents and folders</li>
              <li>Missing or incomplete frontmatter in compositions</li>
              <li>Broken context references in compositions</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              It's recommended to run this check periodically to ensure your vault data remains consistent.
            </p>
          </div>
        )}
        
        {isChecking && (
          <div className="py-10 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Checking vault integrity...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a moment depending on the size of your vault.
            </p>
          </div>
        )}
        
        {errorMessage && !isChecking && !result && (
          <div className="py-6 flex flex-col items-center">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-medium">Error Occurred</h3>
            </div>
            <p className="text-center mb-4">
              There was a problem running the vault integrity check:
            </p>
            <div className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
              {errorMessage}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              This could be due to missing files, permission issues, or corrupted data.
              Try running the check again, or contact support if the issue persists.
            </p>
          </div>
        )}
        
        {result && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              {getTotalIssuesFixed() > 0 ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-medium flex items-center">
                    <span>Fixed {getTotalIssuesFixed()} issues</span>
                    {result.details.some(d => d.includes('⚠️')) && (
                      <span className="ml-2 text-sm text-amber-600 dark:text-amber-400 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Some fixes need attention
                      </span>
                    )}
                  </h3>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-medium">
                    No issues found
                  </h3>
                </>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Documents checked</p>
                <p className="text-2xl">{result.documentsChecked}</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Folders checked</p>
                <p className="text-2xl">{result.foldersChecked}</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Compositions checked</p>
                <p className="text-2xl">{result.compositionsChecked}</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Issues fixed</p>
                <p className="text-2xl">{getTotalIssuesFixed()}</p>
              </div>
            </div>
            
            {getTotalIssuesFixed() > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Issues fixed:</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1"
                  >
                    {showDetails ? "Hide details" : "Show details"}
                    {!showDetails && result.details.some(d => d.includes('⚠️')) && (
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    )}
                  </Button>
                </div>
                
                <ul className="space-y-1 text-sm">
                  {result.duplicateIdsFixed > 0 && (
                    <li>• {result.duplicateIdsFixed} duplicate IDs fixed</li>
                  )}
                  {result.missingMetadataFixed > 0 && (
                    <li>• {result.missingMetadataFixed} missing metadata fields fixed</li>
                  )}
                  {result.invalidDatesFixed > 0 && (
                    <li>• {result.invalidDatesFixed} invalid dates fixed</li>
                  )}
                  {result.orphanedDocumentsFixed > 0 && (
                    <li>• {result.orphanedDocumentsFixed} orphaned documents fixed</li>
                  )}
                  {result.orphanedFoldersFixed > 0 && (
                    <li>• {result.orphanedFoldersFixed} orphaned folders fixed</li>
                  )}
                  {result.brokenContextReferencesFixed > 0 && (
                    <li>• {result.brokenContextReferencesFixed} broken context references fixed</li>
                  )}
                  {result.compositionFrontmatterFixed > 0 && (
                    <li>• {result.compositionFrontmatterFixed} composition frontmatter issues fixed</li>
                  )}
                </ul>
                
                {showDetails && result.details.length > 0 && (
                  <div className="mt-4 max-h-60 overflow-y-auto border rounded-md p-2">
                    <ul className="text-xs space-y-1">
                      {result.details.map((detail, index) => {
                        // Determine if this is a success, warning, or regular message
                        const isSuccess = detail.includes('✓');
                        const isWarning = detail.includes('⚠️');
                        
                        return (
                          <li 
                            key={index} 
                            className={`${isSuccess ? 'text-green-600 dark:text-green-400' : ''} ${isWarning ? 'text-amber-600 dark:text-amber-400' : ''} ${!isSuccess && !isWarning ? 'text-muted-foreground' : ''}`}
                          >
                            {detail}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm mt-6">
              <Info className="h-4 w-4" />
              {result.details.some(d => d.includes('⚠️')) ? (
                <p className="text-amber-600 dark:text-amber-400">
                  Vault integrity check completed with some warnings. Review the details for more information.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Vault integrity check completed successfully. Your vault data should now be consistent.
                </p>
              )}
            </div>
          </div>
        )}
        
        <DialogFooter>
          {!isChecking && !result && (
            <Button onClick={runIntegrityCheck}>
              Run Integrity Check
            </Button>
          )}
          
          {result && (
            <Button onClick={() => {
              setResult(null);
              onOpenChange(false);
            }}>
              Close
            </Button>
          )}
          
          {result && (
            <Button variant="outline" onClick={runIntegrityCheck} disabled={isChecking}>
              Run Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
