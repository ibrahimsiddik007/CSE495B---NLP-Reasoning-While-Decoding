from flask import Flask, render_template, request, jsonify
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import torch.nn.functional as F
import re
import os
import numpy as np
from collections import Counter

app = Flask(__name__)

# Define local model path
MODEL_DIR = "models/qwen2.5-0.5b-instruct"

# Load Qwen model and tokenizer
print("Loading Qwen model...")
model_name = "Qwen/Qwen2.5-0.5B-Instruct"

# Check if model exists locally
if os.path.exists(MODEL_DIR):
    print(f"Loading model from local cache: {MODEL_DIR}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    model = AutoModelForCausalLM.from_pretrained(MODEL_DIR)
else:
    print(f"Model not found locally. Downloading from Hugging Face...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
    
    # Save model locally for future use
    print(f"Saving model to {MODEL_DIR} for future use...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    tokenizer.save_pretrained(MODEL_DIR)
    model.save_pretrained(MODEL_DIR)
    print("Model saved successfully!")

model.eval()
print("Model loaded successfully!")

def compare_strategies(prompt, max_length=100, params=None):
    # Set default parameters if not provided
    default_params = {
        'greedy': {'no_repeat_ngram_size': 2, 'repetition_penalty': 1.2},
        'beam': {'num_beams': 5, 'no_repeat_ngram_size': 3, 'length_penalty': 1.0},
        'topk': {'top_k': 50, 'temperature': 1.0},
        'topp': {'top_p': 0.9, 'temperature': 1.0},
        'temperature': {'temperature': 0.9, 'top_p': 0.9, 'top_k': 50}
    }
    
    if params is None:
        params = default_params
    else:
        # Merge with defaults (use custom if provided, default otherwise)
        for strategy in default_params:
            if strategy not in params:
                params[strategy] = default_params[strategy]
    
    # Validate parameter ranges
    def clamp(value, min_val, max_val):
        return max(min_val, min(max_val, value))
    
    try:
        # Ensure beam has at least 2 beams
        if 'num_beams' in params.get('beam', {}):
            params['beam']['num_beams'] = max(2, int(params['beam']['num_beams']))
        
        # Ensure temperatures are positive (min 0.1, max 2.0)
        for strategy in ['topk', 'topp', 'creative']:
            if strategy in params and 'temperature' in params[strategy]:
                params[strategy]['temperature'] = clamp(float(params[strategy]['temperature']), 0.1, 2.0)
        
        # Ensure top_p is between 0.01 and 1.0
        for strategy in ['topp', 'creative']:
            if strategy in params and 'top_p' in params[strategy]:
                params[strategy]['top_p'] = clamp(float(params[strategy]['top_p']), 0.01, 1.0)
        
        # Ensure top_k is positive
        for strategy in ['topk', 'creative']:
            if strategy in params and 'top_k' in params[strategy]:
                params[strategy]['top_k'] = max(1, int(params[strategy]['top_k']))
        
        # Ensure repetition_penalty is positive
        if 'repetition_penalty' in params.get('greedy', {}):
            params['greedy']['repetition_penalty'] = max(1.0, float(params['greedy']['repetition_penalty']))
        
    except (ValueError, TypeError) as e:
        print(f"Parameter validation error: {e}. Using defaults.")
        params = default_params
    
    input_ids = tokenizer.encode(prompt, return_tensors='pt')
    
    # Get pad token id
    pad_token_id = tokenizer.pad_token_id if tokenizer.pad_token_id is not None else tokenizer.eos_token_id
    
    results = {}
    
    # 1. Greedy Decoding
    with torch.no_grad():
        greedy_output = model.generate(
            input_ids,
            max_length=max_length,
            do_sample=False,
            pad_token_id=pad_token_id,
            no_repeat_ngram_size=params['greedy'].get('no_repeat_ngram_size', 2),
            repetition_penalty=params['greedy'].get('repetition_penalty', 1.2)
        )
    results['greedy'] = tokenizer.decode(greedy_output[0], skip_special_tokens=True)
    
    # 2. Beam Search
    with torch.no_grad():
        beam_output = model.generate(
            input_ids,
            max_length=max_length,
            num_beams=params['beam'].get('num_beams', 5),
            do_sample=False,
            early_stopping=True,
            pad_token_id=pad_token_id,
            no_repeat_ngram_size=params['beam'].get('no_repeat_ngram_size', 3),
            length_penalty=params['beam'].get('length_penalty', 1.0)
        )
    results['beam_search'] = tokenizer.decode(beam_output[0], skip_special_tokens=True)
    
    # 3. Top-K Sampling
    with torch.no_grad():
        topk_output = model.generate(
            input_ids,
            max_length=max_length,
            do_sample=True,
            top_k=params['topk'].get('top_k', 50),
            pad_token_id=pad_token_id,
            temperature=params['topk'].get('temperature', 1.0)
        )
    results['top_k'] = tokenizer.decode(topk_output[0], skip_special_tokens=True)
    
    # 4. Top-P (Nucleus) Sampling
    with torch.no_grad():
        topp_output = model.generate(
            input_ids,
            max_length=max_length,
            do_sample=True,
            top_p=params['topp'].get('top_p', 0.9),
            pad_token_id=pad_token_id,
            temperature=params['topp'].get('temperature', 1.0)
        )
    results['top_p'] = tokenizer.decode(topp_output[0], skip_special_tokens=True)
    
    # 5. Temperature-based Sampling
    with torch.no_grad():
        temperature_output = model.generate(
            input_ids,
            max_length=max_length,
            do_sample=True,
            temperature=params['temperature'].get('temperature', 0.9),
            top_p=params['temperature'].get('top_p', 0.9),
            top_k=params['temperature'].get('top_k', 50),
            pad_token_id=pad_token_id
        )
    results['temperature'] = tokenizer.decode(temperature_output[0], skip_special_tokens=True)
    
    return results

def calculate_text_metrics(text, input_ids=None):
    # Tokenize into words
    words = re.findall(r'\b\w+\b', text.lower())
    
    if len(words) == 0:
        return {
            'perplexity': 0,
            'rep_1': 0,
            'rep_2': 0,
            'rep_3': 0,
            'distinct_1': 0,
            'distinct_2': 0,
            'distinct_3': 0,
            'entropy': 0,
            'length': 0,
            'novelty': 0
        }
    
    # 1. PERPLEXITY - Calculate using the model
    perplexity = 0
    if input_ids is not None:
        try:
            with torch.no_grad():
                # Tokenize the generated text
                encoded = tokenizer.encode(text, return_tensors='pt')
                # Calculate log likelihood
                outputs = model(encoded, labels=encoded)
                loss = outputs.loss
                perplexity = torch.exp(loss).item()
        except:
            perplexity = 0
    
    # 2. REPETITION METRICS (Rep-1, Rep-2, Rep-3)
    def calculate_rep_n(tokens, n):
        if len(tokens) < n:
            return 0
        ngrams = [tuple(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]
        if len(ngrams) == 0:
            return 0
        unique_ngrams = len(set(ngrams))
        total_ngrams = len(ngrams)
        # Rep-n = 1 - (unique/total) = repetition rate
        return round((1 - unique_ngrams / total_ngrams) * 100, 2)
    
    rep_1 = calculate_rep_n(words, 1)  # Unigram repetition
    rep_2 = calculate_rep_n(words, 2)  # Bigram repetition
    rep_3 = calculate_rep_n(words, 3)  # Trigram repetition
    
    # 3. DISTINCT-N METRICS (Distinct-1, Distinct-2, Distinct-3)
    def calculate_distinct_n(tokens, n):
        if len(tokens) < n:
            return 0
        ngrams = [tuple(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]
        if len(ngrams) == 0:
            return 0
        unique_ngrams = len(set(ngrams))
        total_ngrams = len(ngrams)
        return round((unique_ngrams / total_ngrams) * 100, 2)
    
    distinct_1 = calculate_distinct_n(words, 1)  # Unique unigrams
    distinct_2 = calculate_distinct_n(words, 2)  # Unique bigrams
    distinct_3 = calculate_distinct_n(words, 3)  # Unique trigrams
    
    # 4. ENTROPY - Shannon entropy of token distribution
    token_counts = Counter(words)
    total_tokens = len(words)
    probabilities = [count / total_tokens for count in token_counts.values()]
    # Calculate Shannon entropy: -sum(p * log(p))
    text_entropy = -sum(p * np.log2(p) for p in probabilities if p > 0)
    text_entropy = round(text_entropy, 2)
    
    # 5. LENGTH - Word count
    length = len(words)
    
    # 6. NOVELTY - Ratio of unique tokens to vocabulary
    # Simple approach: unique tokens / total tokens (similar to distinct-1 but as novelty measure)
    unique_tokens = len(set(words))
    novelty = round((unique_tokens / length) * 100, 2) if length > 0 else 0
    
    return {
        'perplexity': round(perplexity, 2),
        'rep_1': rep_1,
        'rep_2': rep_2,
        'rep_3': rep_3,
        'distinct_1': distinct_1,
        'distinct_2': distinct_2,
        'distinct_3': distinct_3,
        'entropy': text_entropy,
        'length': length,
        'novelty': novelty
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()
    prompt = data.get('prompt', '')
    max_length = data.get('max_length', 100)
    params = data.get('params', None)
    
    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400
    
    # Generate text with different strategies
    results = compare_strategies(prompt, max_length, params)
    
    # Calculate metrics for each generated text
    metrics = {}
    input_ids = tokenizer.encode(prompt, return_tensors='pt')
    for strategy, text in results.items():
        metrics[strategy] = calculate_text_metrics(text, input_ids)
    
    return jsonify({
        'results': results,
        'metrics': metrics
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
