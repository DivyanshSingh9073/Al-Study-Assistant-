/**
 * AI Study Assistant - PDF.js Extraction Module
 * Extracts text content from local PDF files client-side using PDF.js CDN library.
 */

// Initialize worker src immediately when module is loaded
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

/**
 * Read PDF file and extract all text pages client-side
 * @param {File} file - Local File object from input picker
 * @param {Function} [onProgress] - Optional callback providing (currentPage, totalPages)
 * @returns {Promise<string>} Full extracted text contents
 */
export async function extractTextFromPdf(file, onProgress) {
  if (!window.pdfjsLib) {
    throw new Error('PDF_JS_LIBRARY_NOT_LOADED');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async function (e) {
      try {
        const arrayBuffer = e.target.result;
        const typedarray = new Uint8Array(arrayBuffer);

        // Load the PDF Document
        const loadingTask = window.pdfjsLib.getDocument({ data: typedarray });
        
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        let fullText = '';

        // Iterate through all pages and extract text strings
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Map separate text spans on page to a joined string
          const pageText = textContent.items
            .map((item) => item.str)
            .join(' ');
          
          fullText += `[Page ${pageNum}]\n${pageText}\n\n`;

          // Provide incremental updates if callback exists
          if (typeof onProgress === 'function') {
            onProgress(pageNum, totalPages);
          }
        }

        resolve(fullText.trim());
      } catch (err) {
        console.error('PDF Extraction Error:', err);
        reject(new Error(`PDF parsing failed: ${err.message}`));
      }
    };

    reader.onerror = function (err) {
      reject(new Error('Failed to read PDF file array buffer.'));
    };

    reader.readAsArrayBuffer(file);
  });
}
