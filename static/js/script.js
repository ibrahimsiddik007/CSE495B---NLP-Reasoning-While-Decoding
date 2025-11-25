const promptInput = document.getElementById('prompt');
const maxLengthSlider = document.getElementById('maxLength');
const maxLengthValue = document.getElementById('maxLengthValue');
const generateBtn = document.getElementById('generateBtn');
const toggleParamsBtn = document.getElementById('toggleParams');
const resetParamsBtn = document.getElementById('resetParams');
const paramSection = document.getElementById('paramSection');
const loading = document.getElementById('loading');
const resultsDiv = document.getElementById('results');
const chartsDiv = document.getElementById('charts');

// Default parameters
const defaultParams = {
    greedy: { no_repeat_ngram_size: 2, repetition_penalty: 1.2 },
    beam: { num_beams: 5, no_repeat_ngram_size: 3, length_penalty: 1.0 },
    topk: { top_k: 50, temperature: 1.0 },
    topp: { top_p: 0.9, temperature: 1.0 },
    temperature: { temperature: 0.9, top_p: 0.9, top_k: 50 }
};

// Update max length display
maxLengthSlider.addEventListener('input', (e) => {
    maxLengthValue.textContent = e.target.value;
});

// Toggle parameter section
toggleParamsBtn.addEventListener('click', () => {
    if (paramSection.style.display === 'none') {
        paramSection.style.display = 'block';
        toggleParamsBtn.textContent = 'Hide Parameters';
    } else {
        paramSection.style.display = 'none';
        toggleParamsBtn.textContent = 'Fine-tune Parameters';
    }
});

// Reset parameters to defaults
resetParamsBtn.addEventListener('click', () => {
    // Greedy
    document.getElementById('greedyNgram').value = 2;
    document.getElementById('greedyNgramValue').textContent = 2;
    document.getElementById('greedyRep').value = 1.2;
    document.getElementById('greedyRepValue').textContent = 1.2;
    
    // Beam
    document.getElementById('beamNum').value = 5;
    document.getElementById('beamNumValue').textContent = 5;
    document.getElementById('beamNgram').value = 3;
    document.getElementById('beamNgramValue').textContent = 3;
    document.getElementById('beamLen').value = 1.0;
    document.getElementById('beamLenValue').textContent = 1.0;
    
    // Top-K
    document.getElementById('topkVal').value = 50;
    document.getElementById('topkValue').textContent = 50;
    document.getElementById('topkTemp').value = 1.0;
    document.getElementById('topkTempValue').textContent = 1.0;
    
    // Top-P
    document.getElementById('toppVal').value = 0.9;
    document.getElementById('toppValue').textContent = 0.9;
    document.getElementById('toppTemp').value = 1.0;
    document.getElementById('toppTempValue').textContent = 1.0;
    
    // Temperature-based Sampling
    document.getElementById('temperatureTemp').value = 0.9;
    document.getElementById('temperatureTempValue').textContent = 0.9;
    document.getElementById('temperatureP').value = 0.9;
    document.getElementById('temperaturePValue').textContent = 0.9;
    document.getElementById('temperatureK').value = 50;
    document.getElementById('temperatureKValue').textContent = 50;
});

// Update parameter displays
const paramInputs = [
    { id: 'greedyNgram', display: 'greedyNgramValue' },
    { id: 'greedyRep', display: 'greedyRepValue' },
    { id: 'beamNum', display: 'beamNumValue' },
    { id: 'beamNgram', display: 'beamNgramValue' },
    { id: 'beamLen', display: 'beamLenValue' },
    { id: 'topkVal', display: 'topkValue' },
    { id: 'topkTemp', display: 'topkTempValue' },
    { id: 'toppVal', display: 'toppValue' },
    { id: 'toppTemp', display: 'toppTempValue' },
    { id: 'temperatureTemp', display: 'temperatureTempValue' },
    { id: 'temperatureP', display: 'temperaturePValue' },
    { id: 'temperatureK', display: 'temperatureKValue' }
];

paramInputs.forEach(param => {
    const input = document.getElementById(param.id);
    const display = document.getElementById(param.display);
    input.addEventListener('input', (e) => {
        display.textContent = e.target.value;
    });
});

// Dynamic tooltip positioning
document.addEventListener('mouseover', (e) => {
    const tooltip = e.target.closest('.tooltip');
    if (tooltip) {
        const tooltiptext = tooltip.querySelector('.tooltiptext');
        if (tooltiptext) {
            const rect = tooltip.getBoundingClientRect();
            const tooltipWidth = tooltiptext.offsetWidth || 240;
            const tooltipHeight = tooltiptext.offsetHeight || 100;
            
            // Position above the element with some spacing
            let top = rect.top - tooltipHeight - 10;
            let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            
            // Keep within viewport bounds
            if (left < 10) left = 10;
            if (left + tooltipWidth > window.innerWidth - 10) {
                left = window.innerWidth - tooltipWidth - 10;
            }
            if (top < 10) {
                // If no room above, show below
                top = rect.bottom + 10;
                tooltiptext.style.setProperty('--arrow-position', 'top');
            } else {
                tooltiptext.style.setProperty('--arrow-position', 'bottom');
            }
            
            tooltiptext.style.top = top + 'px';
            tooltiptext.style.left = left + 'px';
        }
    }
});

// Generate button click handler
generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        alert('Please enter a prompt!');
        return;
    }
    
    // Collect parameters
    const params = {
        greedy: {
            no_repeat_ngram_size: parseInt(document.getElementById('greedyNgram').value),
            repetition_penalty: parseFloat(document.getElementById('greedyRep').value)
        },
        beam: {
            num_beams: parseInt(document.getElementById('beamNum').value),
            no_repeat_ngram_size: parseInt(document.getElementById('beamNgram').value),
            length_penalty: parseFloat(document.getElementById('beamLen').value)
        },
        topk: {
            top_k: parseInt(document.getElementById('topkVal').value),
            temperature: parseFloat(document.getElementById('topkTemp').value)
        },
        topp: {
            top_p: parseFloat(document.getElementById('toppVal').value),
            temperature: parseFloat(document.getElementById('toppTemp').value)
        },
        temperature: {
            temperature: parseFloat(document.getElementById('temperatureTemp').value),
            top_p: parseFloat(document.getElementById('temperatureP').value),
            top_k: parseInt(document.getElementById('temperatureK').value)
        }
    };
    
    // Show loading, hide results
    loading.style.display = 'block';
    resultsDiv.style.display = 'none';
    generateBtn.disabled = true;
    
    // Simulate progress steps
    simulateProgress();
    
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt,
                max_length: parseInt(maxLengthSlider.value),
                params: params
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error: ' + data.error);
            resetProgress();
            return;
        }
        
        // Display results
        displayResults(data.results, data.metrics);
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating text.');
        resetProgress();
    } finally {
        loading.style.display = 'none';
        generateBtn.disabled = false;
    }
});

// Simulate progress through generation steps
function simulateProgress() {
    const steps = [
        { text: 'Tokenizing input prompt...', percent: 14, delay: 100 },
        { text: 'Running greedy decoding...', percent: 28, delay: 800 },
        { text: 'Running beam search...', percent: 42, delay: 1600 },
        { text: 'Sampling with Top-K...', percent: 57, delay: 2400 },
        { text: 'Sampling with Top-P (Nucleus)...', percent: 71, delay: 3200 },
        { text: 'Temperature-based sampling...', percent: 85, delay: 4000 },
        { text: 'Computing quality metrics...', percent: 100, delay: 4800 }
    ];
    
    // Reset progress
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressPercentage').textContent = '0%';
    document.getElementById('progressStatus').textContent = 'Initializing generation process';
    
    steps.forEach((step) => {
        setTimeout(() => {
            document.getElementById('progressBar').style.width = step.percent + '%';
            document.getElementById('progressPercentage').textContent = step.percent + '%';
            document.getElementById('progressStatus').textContent = step.text;
        }, step.delay);
    });
}

function resetProgress() {
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressPercentage').textContent = '0%';
    document.getElementById('progressStatus').textContent = 'Initializing generation process';
}

function displayResults(results, metrics) {
    const strategies = ['greedy', 'beam_search', 'top_k', 'top_p', 'temperature'];
    
    // Metric tooltips
    const metricTooltips = {
        perplexity: 'Lower is better. Measures how well the model predicts the text. Values closer to 1 indicate high confidence.',
        repetition: 'Lower is better. Shows percentage of repeated words/phrases at 1-gram, 2-gram, and 3-gram levels.',
        distinct: 'Higher is better. Measures vocabulary diversity by calculating unique n-gram ratios.',
        entropy: 'Higher is better. Shannon entropy measuring randomness and unpredictability in word choices.',
        length: 'Total number of words generated. Varies based on max_length and length_penalty settings.',
        novelty: 'Higher is better. Percentage of unique words indicating lexical creativity and diversity.'
    };
    
    strategies.forEach(strategy => {
        // Display generated text
        const textDiv = document.getElementById(`${strategy}-text`);
        textDiv.textContent = results[strategy];
        
        // Display metrics with bars
        const metricsDiv = document.getElementById(`${strategy}-metrics`);
        const metric = metrics[strategy];
        
        metricsDiv.innerHTML = `
            <div class="metric-bar-item">
                <div class="metric-bar-header">
                    <span class="metric-bar-label tooltip">
                        Perplexity
                        <span class="tooltip-icon">?</span>
                        <span class="tooltiptext">${metricTooltips.perplexity}</span>
                    </span>
                    <span class="metric-bar-value">${metric.perplexity}</span>
                </div>
                <div class="metric-bar-container">
                    <div class="metric-bar-fill" style="width: ${Math.min(metric.perplexity / 2, 100)}%"></div>
                </div>
            </div>
            <div class="metric-bar-item">
                <div class="metric-bar-header">
                    <span class="metric-bar-label tooltip">
                        Rep-1/2/3
                        <span class="tooltip-icon">?</span>
                        <span class="tooltiptext">${metricTooltips.repetition}</span>
                    </span>
                    <span class="metric-bar-value">${metric.rep_1}% / ${metric.rep_2}% / ${metric.rep_3}%</span>
                </div>
                <div class="metric-bar-container">
                    <div class="metric-bar-fill" style="width: ${(metric.rep_1 + metric.rep_2 + metric.rep_3) / 3}%"></div>
                </div>
            </div>
            <div class="metric-bar-item">
                <div class="metric-bar-header">
                    <span class="metric-bar-label tooltip">
                        Distinct-1/2/3
                        <span class="tooltip-icon">?</span>
                        <span class="tooltiptext">${metricTooltips.distinct}</span>
                    </span>
                    <span class="metric-bar-value">${metric.distinct_1}% / ${metric.distinct_2}% / ${metric.distinct_3}%</span>
                </div>
                <div class="metric-bar-container">
                    <div class="metric-bar-fill" style="width: ${(metric.distinct_1 + metric.distinct_2 + metric.distinct_3) / 3}%"></div>
                </div>
            </div>
            <div class="metric-bar-item">
                <div class="metric-bar-header">
                    <span class="metric-bar-label tooltip">
                        Entropy
                        <span class="tooltip-icon">?</span>
                        <span class="tooltiptext">${metricTooltips.entropy}</span>
                    </span>
                    <span class="metric-bar-value">${metric.entropy}</span>
                </div>
                <div class="metric-bar-container">
                    <div class="metric-bar-fill" style="width: ${Math.min(metric.entropy * 10, 100)}%"></div>
                </div>
            </div>
            <div class="metric-bar-item">
                <div class="metric-bar-header">
                    <span class="metric-bar-label tooltip">
                        Length
                        <span class="tooltip-icon">?</span>
                        <span class="tooltiptext">${metricTooltips.length}</span>
                    </span>
                    <span class="metric-bar-value">${metric.length} words</span>
                </div>
                <div class="metric-bar-container">
                    <div class="metric-bar-fill" style="width: ${Math.min(metric.length, 100)}%"></div>
                </div>
            </div>
            <div class="metric-bar-item">
                <div class="metric-bar-header">
                    <span class="metric-bar-label tooltip">
                        Novelty
                        <span class="tooltip-icon">?</span>
                        <span class="tooltiptext">${metricTooltips.novelty}</span>
                    </span>
                    <span class="metric-bar-value">${metric.novelty}%</span>
                </div>
                <div class="metric-bar-container">
                    <div class="metric-bar-fill" style="width: ${metric.novelty}%"></div>
                </div>
            </div>
        `;
    });
    
    resultsDiv.style.display = 'grid';
    
    // Smooth scroll to results
    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
}
