import { useState, useRef } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Badge } from "./badge";
import { Upload, X, File, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFilesUploaded: (files: string[]) => void;
  existingFiles?: string[];
  disabled?: boolean;
  maxFiles?: number;
  label?: string;
}

export default function FileUpload({ 
  onFilesUploaded, 
  existingFiles = [], 
  disabled = false, 
  maxFiles = 10,
  label = "Upload Files"
}: FileUploadProps) {
  const [files, setFiles] = useState<string[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      const newFiles = [...files, ...result.files];
      setFiles(newFiles);
      onFilesUploaded(newFiles);
      
      toast({
        title: "Files uploaded successfully",
        description: `${result.files.length} file(s) uploaded`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesUploaded(newFiles);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading || files.length >= maxFiles}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Choose Files"}
        </Button>
      </div>
      
      <Input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded">
                <File className="h-4 w-4" />
                <span className="text-sm truncate max-w-32">{file}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>{files.length}/{maxFiles} files selected</span>
          </div>
        </div>
      )}
    </div>
  );
}