document.getElementById('summarizeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('summarizeBtn');
    const status = document.getElementById('status');
    const error = document.getElementById('error');

    btn.disabled = true;
    error.textContent = '';
    status.textContent = 'Scraping page content...';

    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Inject script to get the text of the page
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText,
        });

        const pageText = injectionResults[0].result;

        if (!pageText || pageText.trim().length === 0) {
            throw new Error('No readable text found on this page.');
        }

        status.textContent = 'Analyzing and generating PPT (this may take a minute)...';

        // Send to Flask Backend
        const response = await fetch('http://localhost:5069/api/from_extension', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: pageText })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Backend failed to generate PPT');
        }

        // Handle File Download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Create a temporary link to download the file
        chrome.downloads.download({
            url: url,
            filename: 'AI_Summary_Presentation.pptx',
            saveAs: true // Let the user choose where to save
        });

        status.textContent = 'Success! Presentation downloaded.';

    } catch (err) {
        status.textContent = '';
        error.textContent = err.message || 'An error occurred';
        console.error(err);
    } finally {
        setTimeout(() => {
            btn.disabled = false;
            // status.textContent = '';
        }, 3000);
    }
});
