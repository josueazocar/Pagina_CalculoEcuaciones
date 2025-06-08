document.addEventListener('DOMContentLoaded', () => {
    const methodButtons = document.querySelectorAll('.method-button');
    const methodInterface = document.getElementById('method-interface');
    const currentMethodTitle = document.getElementById('current-method-title');
    const functionInput = document.getElementById('functionInput');
    const toggleKeyboardBtn = document.getElementById('toggleKeyboardBtn');
    const onScreenKeyboard = document.getElementById('onScreenKeyboard');
    const keyboardKeys = document.querySelectorAll('#onScreenKeyboard .key');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsArea = document.getElementById('results-area');
    const methodSpecificInputsContainer = document.getElementById('method-specific-inputs');

    const calculationDetailsDiv = document.getElementById('calculation-details');
    const functionChartCanvas = document.getElementById('functionChart');
    const valuesTableContainer = document.getElementById('values-table-container');
    const formulaDisplay = document.getElementById('formula-display');
    const procedureDisplay = document.getElementById('procedure-display');
    const resultDisplay = document.getElementById('result-display');

    let currentAngleUnit = 'radians';
    let currentSignificantFigures = 4;
    let currentDecimalOperation = 'truncate';
    let activeMethodKey = null;
    let lastAns = '';
    let chartInstance = null;
    //Hola
    // Ya no necesitamos una instancia separada de parser para la forma en que lo estamos usando.
    // const parser = math.parser(); // Esta línea se puede eliminar o comentar.

    // --- CONFIGURACIÓN ---
    document.querySelectorAll('input[name="angleUnit"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            currentAngleUnit = event.target.value;
            console.log("Unidad Angular:", currentAngleUnit);
        });
    });

    const significantFiguresInput = document.getElementById('significantFigures');
    significantFiguresInput.addEventListener('input', () => {
        const val = parseInt(significantFiguresInput.value);
        if (val >= 1 && val <= 6) {
            currentSignificantFigures = val;
        }
    });
    significantFiguresInput.addEventListener('blur', () => {
        let val = parseInt(significantFiguresInput.value);
        if (isNaN(val) || val < 1) {
            significantFiguresInput.value = 1;
            currentSignificantFigures = 1;
        } else if (val > 6) {
            significantFiguresInput.value = 6;
            currentSignificantFigures = 6;
        }
        console.log("Cifras Significativas (final):", currentSignificantFigures);
    });

    document.querySelectorAll('input[name="decimalOperation"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            currentDecimalOperation = event.target.value;
            console.log("Operación Decimal:", currentDecimalOperation);
        });
    });


    // --- MANEJO DE MENÚ Y TECLADO ---
    methodButtons.forEach(button => {
        button.addEventListener('click', () => {
            const methodName = button.textContent;
            activeMethodKey = button.dataset.method;

            currentMethodTitle.textContent = `${methodName}`;
            methodInterface.classList.remove('hidden');
            calculateBtn.classList.remove('hidden');

            resultsArea.classList.add('hidden');
            calculationDetailsDiv.classList.add('hidden');
            formulaDisplay.textContent = '-';
            procedureDisplay.innerHTML = '-';
            resultDisplay.textContent = '-';
            valuesTableContainer.innerHTML = '';

            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }

            functionInput.value = '';
            methodSpecificInputsContainer.innerHTML = '';
            generateMethodSpecificInputs(activeMethodKey);

            console.log(`Método seleccionado: ${activeMethodKey}`);
            functionInput.focus();
        });
    });

    toggleKeyboardBtn.addEventListener('click', () => {
        const isHidden = onScreenKeyboard.classList.toggle('hidden');
        toggleKeyboardBtn.textContent = isHidden ? '⌨️ Teclado' : 'Ocultar Teclado';
        if (!isHidden) {
            functionInput.focus();
        }
    });

    keyboardKeys.forEach(key => {
        key.addEventListener('click', (e) => {
            e.preventDefault();
            const value = key.dataset.value;
            const currentCursorPos = functionInput.selectionStart;
            const currentValue = functionInput.value;
            let textToInsert = value;

            if (value === 'ans') {
                textToInsert = lastAns.toString();
            } else if (value === 'pi') {
                textToInsert = 'pi';
            } else if (value === 'e') {
                textToInsert = 'e';
            }

            if (value === 'bcksp') {
                if (currentCursorPos > 0) {
                    functionInput.value = currentValue.substring(0, currentCursorPos - 1) + currentValue.substring(currentCursorPos);
                    functionInput.setSelectionRange(currentCursorPos - 1, currentCursorPos - 1);
                }
            } else if (value === 'clear') {
                functionInput.value = '';
            } else if (value === 'enter') {
                if (!calculateBtn.classList.contains('hidden')) {
                    calculateBtn.click();
                }
            } else {
                functionInput.value = currentValue.substring(0, currentCursorPos) + textToInsert + currentValue.substring(currentCursorPos);
                const newCursorPos = currentCursorPos + textToInsert.length;
                functionInput.setSelectionRange(newCursorPos, newCursorPos);
            }
            functionInput.focus();
        });
    });

    // --- GENERADOR DE INPUTS ESPECÍFICOS ---
    function generateMethodSpecificInputs(methodKey) {
        methodSpecificInputsContainer.innerHTML = '';
        switch (methodKey) {
            case 'grafico':
                methodSpecificInputsContainer.innerHTML = `
                    <label for="x_inicial">Valor Inicial de x (para graficar):</label>
                    <input type="number" id="x_inicial" name="x_inicial" value="-5" step="any">
                    <label for="x_final">Valor Final de x (para graficar):</label>
                    <input type="number" id="x_final" name="x_final" value="5" step="any">
                    <label for="num_puntos">Número de Puntos (resolución):</label>
                    <input type="number" id="num_puntos" name="num_puntos" value="100" min="10" max="1000">
                `;
                break;
            // ... otros casos
        }
    }

    // --- FUNCIÓN DE AJUSTE NUMÉRICO (SIMPLIFICADA) ---
    function simpleAdjust(value, sigFigs, operationType) {
        if (isNaN(value) || !isFinite(value) || value === 0) {
            if (value === 0 && sigFigs > 0 && operationType !== 'no_adjust') {
                return parseFloat(value.toFixed(Math.max(0, sigFigs -1)));
            }
            return value;
        }

        const absValue = Math.abs(value);
        const magnitude = Math.floor(Math.log10(absValue));
        let decimalPlaces = sigFigs - 1 - magnitude;

        if (absValue < 1 && magnitude < 0) { // Para números como 0.00123, sigFigs = 3. magnitude = -3. decPlaces = 3 - 1 - (-3) = 5
             decimalPlaces = sigFigs + Math.abs(magnitude) -1;
        } else if (decimalPlaces < 0) { // Para números grandes como 12345, sigFigs = 3 -> decPlaces = 3 - 1 - 4 = -2
            decimalPlaces = 0;
        }
        decimalPlaces = Math.max(0, decimalPlaces); // Asegurarse que no sea negativo

        const factor = Math.pow(10, decimalPlaces);
        let adjustedValue;

        if (operationType === 'truncate') {
            adjustedValue = Math.trunc(value * factor) / factor;
        } else if (operationType === 'round') {
            adjustedValue = Math.round(value * factor) / factor;
        } else { // no_adjust
            return value;
        }
        
        // Para la visualización, `toFixed` ayuda a mostrar los ceros finales correctos.
        // Devolver como número para cálculos, pero para mostrar se podría usar toFixed.
        return parseFloat(adjustedValue.toFixed(decimalPlaces));
    }


    // --- BOTÓN DE CÁLCULO ---
    calculateBtn.addEventListener('click', () => {
        resultsArea.classList.add('hidden');
        calculationDetailsDiv.classList.add('hidden');
        formulaDisplay.textContent = '-';
        procedureDisplay.innerHTML = '-';
        resultDisplay.textContent = '-';
        valuesTableContainer.innerHTML = '';
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        const funcStrOriginal = functionInput.value.trim();
        console.log("Función original ingresada por el usuario:", funcStrOriginal);

        if (!funcStrOriginal) {
            alert("Por favor, ingrese una función f(x).");
            return;
        }

        let processedFuncStr = funcStrOriginal.replace(/\bln\b/g, 'log');
        console.log("Función después de reemplazar ln por log:", processedFuncStr);

        // Para la validación, intentamos evaluar con x=1
        // Math.js maneja constantes como 'e' y 'pi' directamente.
        let testEvalStr = processedFuncStr.replace(/x/g, '(1)'); // Reemplazar 'x' por '(1)' para la prueba
        console.log("Función para evaluación de prueba (x reemplazado por (1)):", testEvalStr);

        try {
            math.evaluate(testEvalStr); // Usar math.evaluate directamente
        } catch (e) {
            alert(`Error de sintaxis en la función: ${e.message}\n\nEjemplo de función válida: e^-x - log(x)\nO también: exp(-x) - log(x)\n\n(Asegúrese de que 'log' sea logaritmo natural, o use 'log10' para base 10)`);
            console.error("Error durante la evaluación de prueba:", e);
            console.error("Cadena que causó el error de prueba:", testEvalStr);
            return;
        }

        resultsArea.classList.remove('hidden');

        switch (activeMethodKey) {
            case 'grafico':
                calculateGrafico(processedFuncStr); // Pasar la cadena solo con ln->log
                break;
            default:
                resultDisplay.textContent = "Método no implementado aún.";
        }
    });

    // --- LÓGICA DEL MÉTODO GRÁFICO ---
    function calculateGrafico(funcStr) { // funcStr ya tiene ln reemplazado por log
        const xInicialInput = document.getElementById('x_inicial');
        const xFinalInput = document.getElementById('x_final');
        const numPuntosInput = document.getElementById('num_puntos');

        if (!xInicialInput || !xFinalInput || !numPuntosInput) {
            resultDisplay.textContent = "Error: No se encontraron los campos de entrada para el método gráfico.";
            return;
        }

        const xInicial = parseFloat(xInicialInput.value);
        const xFinal = parseFloat(xFinalInput.value);
        const numPuntos = parseInt(numPuntosInput.value);

        if (isNaN(xInicial) || isNaN(xFinal) || isNaN(numPuntos)) {
            resultDisplay.textContent = "Ingrese valores numéricos válidos para el rango y número de puntos.";
            return;
        }
        if (xInicial >= xFinal) {
            resultDisplay.textContent = "El valor inicial de x debe ser menor que el valor final.";
            return;
        }
        if (numPuntos < 2 || numPuntos > 2000) {
            resultDisplay.textContent = "El número de puntos debe estar entre 2 y 2000.";
            return;
        }

        const xValues = [];
        const yValues = [];
        const tableData = [];
        const step = (xFinal - xInicial) / (numPuntos - 1);
        let compiledFunc;

        console.log("Función que se compilará para el gráfico:", funcStr);
        try {
            compiledFunc = math.compile(funcStr); // CORRECCIÓN AQUÍ: usar math.compile
        } catch (e) {
            resultDisplay.textContent = `Error al compilar la función: ${e.message}. Revise la sintaxis.`;
            console.error("Error al compilar la función para el gráfico:", e);
            console.error("Cadena que causó el error de compilación:", funcStr);
            return;
        }

        for (let i = 0; i < numPuntos; i++) {
            let x_raw = xInicial + i * step;
            let y_raw;
            try {
                // 'e' y 'pi' son reconocidas por Math.js si están en el scope o son globales.
                // Math.js ya las define globalmente.
                const scope = { x: x_raw };
                y_raw = compiledFunc.evaluate(scope);
            } catch (e) {
                y_raw = NaN;
                console.warn(`Error evaluando f(${x_raw}) con la función compilada: ${e.message}`);
            }

            const xForTable = simpleAdjust(x_raw, currentSignificantFigures, currentDecimalOperation);
            const yForTable = simpleAdjust(y_raw, currentSignificantFigures, currentDecimalOperation);

            xValues.push(x_raw);
            yValues.push(y_raw);
            tableData.push({ x: xForTable, y: yForTable });
        }

        calculationDetailsDiv.classList.remove('hidden');
        let tableHTML = '<table><thead><tr><th>x</th><th>f(x)</th></tr></thead><tbody>';
        tableData.forEach(point => {
            tableHTML += `<tr><td>${point.x === null || isNaN(point.x) ? 'Error' : point.x}</td><td>${point.y === null || isNaN(point.y) ? 'Error/Indef.' : point.y}</td></tr>`;
        });
        tableHTML += '</tbody></table>';
        valuesTableContainer.innerHTML = tableHTML;

        if (chartInstance) {
            chartInstance.destroy();
        }
        const ctx = functionChartCanvas.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xValues.map(x => parseFloat(x.toFixed(Math.max(2, currentSignificantFigures -1)))), // Ajuste para etiquetas
                datasets: [{
                    label: `f(x) = ${functionInput.value.trim()}`, // Mostrar la función original en la leyenda
                    data: yValues,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: numPuntos <= 150 ? 2.5 : 0,
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)'
                },
                {
                    label: 'y = 0 (Eje X)',
                    data: xValues.map(() => 0),
                    borderColor: 'rgba(255, 99, 132, 0.8)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'x', font: {size: 14, weight: 'bold'} },
                        ticks: {
                            maxTicksLimit: 10,
                             callback: function(value) { return Number(value.toPrecision(3)); }
                        }
                    },
                    y: {
                        title: { display: true, text: 'f(x)', font: {size: 14, weight: 'bold'} },
                         ticks: { callback: function(value) { return Number(value.toPrecision(3)); } }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (!label.startsWith("f(x)") && !label.startsWith("y = 0")) {
                                     if (label) label += ': ';
                                } else if (label.startsWith("f(x)")) {
                                    label = "f(x): ";
                                }

                                if (context.parsed.y !== null) {
                                    const yTooltipAdjusted = simpleAdjust(parseFloat(context.raw), currentSignificantFigures, currentDecimalOperation);
                                    label += yTooltipAdjusted;
                                }
                                return label;
                            }
                        }
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });

        formulaDisplay.textContent = `f(x) = ${functionInput.value.trim()}`;
        procedureDisplay.innerHTML = `
            <p>Se graficó la función en el intervalo [${xInicial}, ${xFinal}] usando ${numPuntos} puntos.</p>
            <p>La tabla de valores muestra 'x' y 'f(x)' con <strong>${currentDecimalOperation === 'truncate' ? 'Truncamiento' : 'Redondeo'}</strong>.</p>
        `;
        resultDisplay.textContent = "Observe la gráfica para estimar la raíz (donde f(x) cruza el eje x). La tabla de valores ayuda a identificar cambios de signo en f(x) y valores cercanos a cero.";
    }

    function setLastAns(result) {
        lastAns = simpleAdjust(result, currentSignificantFigures, currentDecimalOperation);
        console.log("ANS guardado:", lastAns);
    }

});