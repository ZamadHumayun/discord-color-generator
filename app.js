document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const editor = document.getElementById('rich-editor');
    const previewRender = document.getElementById('preview-render');
    const rawOutput = document.getElementById('raw-output');
    const charCounter = document.getElementById('char-counter');
    const btnBold = document.getElementById('btn-bold');
    const btnUnderline = document.getElementById('btn-underline');
    const btnClear = document.getElementById('btn-clear');
    const btnCopy = document.getElementById('btn-copy');
    const toast = document.getElementById('toast');

    // Dropdowns
    const dropdownTriggers = document.querySelectorAll('.dropdown-trigger');
    const colorOptions = document.querySelectorAll('.color-option');

    // Color Maps (Hex and RGB to ANSI Code)
    const textColors = {
        '#4f545c': '30', 'rgb(79, 84, 92)': '30',   // Gray
        '#dc2626': '31', 'rgb(220, 38, 38)': '31',  // Red
        '#16a34a': '32', 'rgb(22, 163, 74)': '32',  // Green
        '#ca8a04': '33', 'rgb(202, 138, 4)': '33',  // Yellow
        '#2563eb': '34', 'rgb(37, 99, 235)': '34',  // Blue
        '#db2777': '35', 'rgb(219, 39, 119)': '35', // Pink
        '#0d9488': '36', 'rgb(13, 148, 136)': '36', // Cyan
        '#ffffff': '37', 'rgb(255, 255, 255)': '37' // White
    };

    const bgColors = {
        '#1e1f22': '40', 'rgb(30, 31, 34)': '40',   // Dark Blue
        '#ea580c': '41', 'rgb(234, 88, 12)': '41',  // Orange
        '#0284c7': '42', 'rgb(2, 132, 199)': '42',  // Marble Blue
        '#0891b2': '43', 'rgb(8, 145, 178)': '43',  // Turquoise
        '#4b5563': '44', 'rgb(75, 85, 99)': '44',   // Gray
        '#6366f1': '45', 'rgb(99, 102, 241)': '45', // Indigo
        '#9ca3af': '46', 'rgb(156, 163, 175)': '46', // Light Gray
        '#f3f4f6': '47', 'rgb(243, 244, 246)': '47' // White
    };

    // Color indicators in CSS format for active UI styling
    const textColorHexMap = {
        '30': '#4f545c', '31': '#dc2626', '32': '#16a34a', '33': '#ca8a04',
        '34': '#2563eb', '35': '#db2777', '36': '#0d9488', '37': '#ffffff'
    };
    
    const bgColorHexMap = {
        '40': '#1e1f22', '41': '#ea580c', '42': '#0284c7', '43': '#0891b2',
        '44': '#4b5563', '45': '#6366f1', '46': '#9ca3af', '47': '#f3f4f6'
    };

    // Initialize Editor focus
    editor.focus();

    // Toggle Dropdowns
    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = trigger.parentElement;
            const menu = parent.querySelector('.color-dropdown');
            
            // Close other dropdowns
            document.querySelectorAll('.color-dropdown').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });
            
            menu.classList.toggle('show');
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.color-dropdown').forEach(m => {
            m.classList.remove('show');
        });
    });

    // Apply color options
    colorOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const textColorCode = option.getAttribute('data-color');
            const bgColorCode = option.getAttribute('data-bg');

            if (textColorCode) {
                const hexColor = textColorHexMap[textColorCode];
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('foreColor', false, hexColor);
                document.getElementById('text-color-indicator').style.backgroundColor = hexColor;
            } else if (bgColorCode) {
                const hexBg = bgColorHexMap[bgColorCode];
                document.execCommand('styleWithCSS', false, true);
                document.execCommand('hiliteColor', false, hexBg);
                document.getElementById('bg-color-indicator').style.backgroundColor = hexBg;
            }

            // Close dropdowns and update
            document.querySelectorAll('.color-dropdown').forEach(m => m.classList.remove('show'));
            updateOutput();
            editor.focus();
        });
    });

    // Toolbar Basic Operations
    btnBold.addEventListener('click', () => {
        document.execCommand('bold', false);
        btnBold.classList.toggle('active', document.queryCommandState('bold'));
        updateOutput();
        editor.focus();
    });

    btnUnderline.addEventListener('click', () => {
        document.execCommand('underline', false);
        btnUnderline.classList.toggle('active', document.queryCommandState('underline'));
        updateOutput();
        editor.focus();
    });

    btnClear.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all formatting?')) {
            editor.innerHTML = editor.innerText.replace(/\n/g, '<br>');
            document.getElementById('text-color-indicator').style.backgroundColor = 'transparent';
            document.getElementById('bg-color-indicator').style.backgroundColor = 'transparent';
            updateOutput();
            editor.focus();
        }
    });

    // Keep toolbar active state synced on selection changes
    editor.addEventListener('keyup', updateActiveToolbarStates);
    editor.addEventListener('mouseup', updateActiveToolbarStates);

    function updateActiveToolbarStates() {
        btnBold.classList.toggle('active', document.queryCommandState('bold'));
        btnUnderline.classList.toggle('active', document.queryCommandState('underline'));
    }

    // Monitor input changes
    editor.addEventListener('input', () => {
        updateOutput();
    });

    // Helper: Normalize RGB/Hex strings for dictionary mapping
    function cleanStyleValue(value) {
        if (!value) return '';
        return value.replace(/\s+/g, '').toLowerCase();
    }

    // Main logic: Parse DOM to ANSI string
    function parseDOMtoANSI(node, currentStyles = { bold: false, underline: false, color: null, bg: null }) {
        let result = '';
        let styles = { ...currentStyles };

        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();

            // Tag checking
            if (tagName === 'b' || tagName === 'strong') styles.bold = true;
            if (tagName === 'u') styles.underline = true;
            if (tagName === 'br') return '\n';

            // Inline styles checking
            const inlineStyle = node.style;
            if (inlineStyle.fontWeight === 'bold' || inlineStyle.fontWeight === '700') {
                styles.bold = true;
            }
            if (inlineStyle.textDecoration.includes('underline')) {
                styles.underline = true;
            }

            // Text Color mapping
            if (inlineStyle.color) {
                const cleanedColor = cleanStyleValue(inlineStyle.color);
                // Try matching RGB or Hex keys
                for (let key in textColors) {
                    if (cleanStyleValue(key) === cleanedColor) {
                        styles.color = textColors[key];
                        break;
                    }
                }
            }

            // Background highlight mapping
            if (inlineStyle.backgroundColor) {
                const cleanedBg = cleanStyleValue(inlineStyle.backgroundColor);
                for (let key in bgColors) {
                    if (cleanStyleValue(key) === cleanedBg) {
                        styles.bg = bgColors[key];
                        break;
                    }
                }
            }

            // Process child nodes recursively
            let childrenContent = '';
            node.childNodes.forEach(child => {
                childrenContent += parseDOMtoANSI(child, styles);
            });

            // Adjust line breaks for div/p elements
            if (tagName === 'div' || tagName === 'p') {
                // If it's a div and it only has one child which is a BR, it's a blank line
                if (node.childNodes.length === 1 && node.childNodes[0].tagName?.toLowerCase() === 'br') {
                    return '\n';
                }
                return childrenContent + '\n';
            }

            return childrenContent;
        }

        // Text Node processing
        if (node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent;
            if (!textContent) return '';

            let formatCodes = [];
            if (styles.bold) formatCodes.push('1');
            if (styles.underline) formatCodes.push('4');
            if (styles.color) formatCodes.push(styles.color);
            if (styles.bg) formatCodes.push(styles.bg);

            if (formatCodes.length > 0) {
                // ESC character = String.fromCharCode(27)
                const ESC = String.fromCharCode(27);
                return `${ESC}[${formatCodes.join(';')}m${textContent}${ESC}[0m`;
            }
            return textContent;
        }

        return result;
    }

    // Clean generated ANSI sequence trailing resets for better output presentation
    function cleanANSIString(str) {
        // Replace consecutive reset blocks with single ones if cleanups are needed
        return str;
    }

    // Generate simulated HTML for Discord Chat Preview Panel
    function updateSimulatorPreview(editorHTML) {
        if (!editorHTML || editorHTML.trim() === '' || editorHTML === '<br>') {
            previewRender.innerHTML = '<span class="text-muted" style="opacity: 0.5;">Type in the editor to see your preview here...</span>';
            return;
        }

        // Clone editor HTML and make safe for display inside Discord mockup
        let cleanHTML = editorHTML;
        
        // Ensure fonts inside simulator are monospace
        previewRender.innerHTML = cleanHTML;
    }

    // Main Update Thread
    function updateOutput() {
        const children = editor.childNodes;
        let finalANSI = '';

        children.forEach(child => {
            finalANSI += parseDOMtoANSI(child);
        });

        // Clean trailing extra linebreaks caused by DIV wrappers
        if (finalANSI.endsWith('\n') && editor.innerText.endsWith('\n')) {
            finalANSI = finalANSI.slice(0, -1);
        }

        // Generate final ready-to-copy code
        if (finalANSI.trim() !== '') {
            rawOutput.value = '```ansi\n' + finalANSI + '\n```';
        } else {
            rawOutput.value = '';
        }

        // Update Characters Counter
        const plainText = editor.innerText.replace(/\n/g, '');
        charCounter.textContent = `${plainText.length} character${plainText.length !== 1 ? 's' : ''}`;

        // Render Discord simulator
        updateSimulatorPreview(editor.innerHTML);
    }

    // Copy to Clipboard Utility
    btnCopy.addEventListener('click', () => {
        if (!rawOutput.value) return;

        navigator.clipboard.writeText(rawOutput.value).then(() => {
            // Show toast message
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2500);
        }).catch(err => {
            alert('Failed to copy code: ' + err);
        });
    });

    // Keyboard Shortcuts support (Ctrl+B / Ctrl+U)
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                btnBold.click();
            }
            if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                btnUnderline.click();
            }
        }
    });
});
