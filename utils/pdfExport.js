import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generatePDFReport(data) {
    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width
    container.style.backgroundColor = 'white';
    document.body.appendChild(container);

    // Dynamically import and render PortfolioReport
    const { default: PortfolioReport } = await import('@/components/PortfolioReport');
    const { createRoot } = await import('react-dom/client');
    const React = await import('react');

    const root = createRoot(container);

    return new Promise((resolve) => {
        root.render(React.createElement(PortfolioReport, { data }));

        // Wait for render
        setTimeout(async () => {
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pages = container.querySelectorAll('[data-pdf-page], .break-before-page');
            const pageHeight = 297; // A4 height in mm

            for (let i = 0; i < Math.max(pages.length, 1); i++) {
                if (i > 0) pdf.addPage();

                const element = pages[i] || container;
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 210; // A4 width
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
            }

            // Clean up
            root.unmount();
            document.body.removeChild(container);

            // Get blob and open in new tab
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.open(blobUrl, '_blank');

            resolve();
        }, 500);
    });
}
