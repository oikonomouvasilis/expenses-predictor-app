import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadBankFile } from '../api'; 

// Pre-defined UI configuration for supported banks
const banks = [
  { id: 'EUROBANK', name: 'Eurobank', color: 'bg-red-600 hover:bg-red-700', accept: '.csv' },
  { id: 'PIRAEUS', name: 'Piraeus Bank', color: 'bg-yellow-500 hover:bg-yellow-600', accept: '.xlsx' },
  { id: 'NBG', name: 'National Bank', color: 'bg-cyan-600 hover:bg-cyan-700', accept: '.xlsx' },
  { id: 'ALPHA', name: 'Alpha Bank', color: 'bg-blue-800 hover:bg-blue-900', accept: '.csv' }
];

/**
 * UPLOAD SECTION COMPONENT
 * A standalone UI component for ingesting bank statements. 
 * Uses a hidden HTML file input triggered programmatically by styled buttons.
 */
const UploadSection = ({ onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Ref used to trigger the native OS file selection dialog
  const fileInputRef = useRef(null);
  const [selectedBank, setSelectedBank] = useState(null);

  /**
   * HANDLER: BUTTON CLICK
   * Stores the selected bank ID and programmatically clicks the hidden file input.
   */
  const handleButtonClick = (bankId) => {
    setSelectedBank(bankId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * HANDLER: FILE SELECTION
   * Intercepts the selected file, constructs the payload, and sends it to the API.
   */
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedBank) return;

    setLoading(true);
    setMessage(null);

    try {
      console.log(`Uploading ${file.name} for ${selectedBank}...`);
      
      // Execute the API call to upload the file to FastAPI
      const result = await uploadBankFile(file, selectedBank);
      
      setMessage({ type: 'success', text: `Success! ${result.count} transactions added.` });
      
      // Reset the input value to allow uploading the exact same file again if needed
      event.target.value = ''; 
      
      // Trigger a UI refresh if the parent component provided a callback
      if (onUploadSuccess) onUploadSuccess();

    } catch (error) {
      setMessage({ type: 'error', text: 'Upload failed. Check backend console.' });
    } finally {
      setLoading(false);
      setSelectedBank(null); // Reset selection state
    }
  };

  return (
    <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-lg mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-400" />
        Upload Bank Statements
      </h2>

      {/* HIDDEN INPUT: Handles the actual file selection logic */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".csv, .xlsx"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {banks.map((bank) => (
          <button
            key={bank.id}
            onClick={() => handleButtonClick(bank.id)}
            disabled={loading}
            className={`${bank.color} text-white font-medium py-4 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading && selectedBank === bank.id ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span className="text-lg">{bank.name}</span>
                <span className="text-xs opacity-75">Click to upload {bank.accept}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Feedback Banner */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300 border border-red-800'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}
    </div>
  );
};

export default UploadSection;