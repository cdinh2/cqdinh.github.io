
function softmax(x){
    
    var result = [];
    var e_z = [];
    for(var i = 0; i < x.length; i++){
        e_z.push(Math.exp(x[i]));
    }
    var sum = 0;
    for(var i = 0; i < x.length; i++){
        sum += e_z[i];
    }
    for(var i = 0; i < x.length; i++){
        result.push(e_z[i] / sum);
    }
    return result;
}

function sigmoid(x){
    var result = [];
    for(var i = 0; i < x.length; i++){
        result.push(1/(1 + Math.pow(Math.E, -x[i])));
    }
    return result;
}

function tanh(x){
    var result = [];
    for(var i = 0; i < x.length; i++){
        result.push(Math.tanh(x[i]));
    }
    return result;
}

function pmul(a, b){
    var result = [];
    for(var i = 0; i < a.length; i++){
        result.push(a[i] * b[i]);
    }
    return result;
}

function padd(a, b){
    var result = [];
    for(var i = 0; i < a.length; i++){
        result.push(a[i] + b[i]);
    }
    return result;
}

function lstm(x, h, c, lstm, forget_bias=1.0){
    var w = lstm.weights
    var b = lstm.biases
    var input = x.concat(h);
    var i = [];
    var j = [];
    var f = [];
    var o = [];
    var out_size = b.length / 4;
    for(var row_num = 0; row_num < out_size; row_num++){
        i.push(b[row_num]);
        j.push(b[row_num]);
        f.push(b[row_num] + forget_bias);
        o.push(b[row_num]);
        for(var n = 0; n < input.length; n++){
            i[i.length-1] += input[n] * w[row_num + out_size * 0][n];
            j[j.length-1] += input[n] * w[row_num + out_size * 1][n];
            f[f.length-1] += input[n] * w[row_num + out_size * 2][n];
            o[o.length-1] += input[n] * w[row_num + out_size * 3][n];
        }
    }
    
    var new_c = padd(pmul(c, sigmoid(f)), pmul(sigmoid(i), tanh(j)));
    var new_h = pmul(tanh(new_c), sigmoid(o));
    
    return [new_h, new_c];  
}

function softmaxLayer(x, layer){
    var result = [];
    var val = 0;
    for (var row = 0; row < layer.biases.length; row++){
        val = layer.biases[row];
        for(var col = 0; col < x.length; col++){
            val += x[col] * layer.weights[row][col];
        }
        result.push(val);
    }
    return softmax(result);
}

function lstm_stack(x, h_array, c_array, lstms, forget_bias=1.0, num_layers=-1, in_place=false){
    var vector = x;
    if (!in_place){
        var h = [];
        var c = [];
    }
    for(var layer = 0; num_layers < 0 || layer < num_layers; layer++){
        var results = lstm(vector, h_array[layer], c_array[layer], lstms[layer], forget_bias);
        if(in_place){
            h_array[layer] = results[0];
            c_array[layer] = results[1];
        } else {
            h.push(results[0]);
            c.push(results[1]);
        }
        vector = results[0];
    }
    if (in_place){
        return vector;   
    }
    return [vector, h, c];
}

function zero_state(model){
    var c = [];
    for(var i = 0; i < model.depth; i++){
        c.push([]);
        for(var j = 0; j < model.width; j++){
            c[c.length - 1].push(0);
        }
    }
    return c;
}

function searchsorted(a, v){
    var min_index = 0;
    var max_index = a.length - 1;
    var index = (min_index + max_index) / 2 | 0;
    var val;
    
    while (min_index <= max_index){        
        if (a[index] < v) {
            min_index = index + 1;
        } else {
            max_index = index
        }
        index = (min_index + max_index) / 2 | 0;
    }
    return index
}

function sample(){
    var sample_type_select = document.getElementById("sample_type");
    var sample_type = sample_type_select.options[sample_type_select.selectedIndex].value;
    var sample_size = parseInt(document.getElementById("sample_size").value);
    var sample_seed = document.getElementById("sample_seed").value;
    var sample_array = [''];
    var model = models[sample_type];
    var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var split_seed = sample_seed.split('');
    var chr;
    for(var i = 0; i < split_seed.length; i++) {
        chr = split_seed[i];
        if(alphabet.includes(chr)){
            sample_array[sample_array.length - 1] = sample_array[sample_array.length - 1].concat(chr);
        } else {
            sample_array.push(chr);
            sample_array.push('');
        }
    }
    var sample_vectors = [];
    var str;
    for(var i = 0; i < sample_array.length; i++){
        var str = sample_array[i]
        if(str != ''){
            sample_vectors.push(model.embeddings[model.decoder[str]]);
        }
    }
    var sample = sample_seed;
    var h = zero_state(model);
    var c = zero_state(model);
    var result;
    var vec;
    for(var i = 0; i < sample_vectors.length; i++){
        result = lstm_stack(sample_vectors[i], h, c, model.weights, model.biases, 1, -1, true);
    }
    var probs;
    var cum_probs;
    var sum;
    var chosen;
    var resnum;
    for(var i = 0; i < sample_size; i++){
        probs = softmax_layer(lstm_stack(result, h, c, model.lstms, 1, -1, true), model.softmax);
        cum_probs = [probs[0]];
        sum = probs[0];
        for(var j = 1; j < probs.length; j++){
            sum += probs[j];
            cum_probs.push(sum);
        }
        chosen = Math.random() * sum;        
        resnum = searchsorted(cum_probs, chosen);
        result = model.embeddings[resnum];
        sample.concat(model.decoder[resnum]);
    }
    document.getElementById('results').innerHTML = sample;
}

function init(){
    document.getElementById('sample-form').onsubmit = sample;
}

init();
