# TN-R01 · Réplica independiente

Candidato `4217f70e2a140d03746873183dad5328a65e1fba`. Referencia `ceaf934efb37df8f456a08af0c6f047fb4a118e6`. Marco de decisión RDL-PB-001 v0.1.

## Criterios fijados antes de correr los controles nuevos

- Comparar números con tolerancia absoluta 1e-10 más 1e-9 relativa y decisiones discretas por igualdad. Comparar cada MAE con el del expediente tras su redondeo a nueve cifras significativas. Preservar las nueve trayectorias de 180 precios, el calentamiento de 50, las semillas 17/23/47 y los 129 objetivos siguientes por trayectoria.
- En el caso de cambio de régimen con semilla 17, comprobar los diez MAE de la primera ventana activa y de sus segmentos 70/30. El control causal recalcula Γ sobre el prefijo disponible dentro del segmento hasta cada origen y mantiene la subventana de hasta 21 precios que consume el predictor, los objetivos y los pesos 70/30. Una diferencia que excede la tolerancia prueba sensibilidad para ese contraste. No se vuelve a ajustar ni ejecutar GEI con los MAE del control.
- En cada origen externo, añadir como comparador independiente un T1 con centro en la media de **precios** de la ventana y el α original derivado de autocorrelación. Mantener la forma μ + α(μ − último precio). Evaluar mejora estricta sobre Random Walk por trayectoria y familia, sin reajustar GEI ni Π. Es un control dimensional, no una validación de la teoría de reversión.
- Capturar los valores de las dos colecciones de la primera fila al insertarla y releer el mismo objeto al terminar. Comparar contenidos e identidad. Para I1 contrastar la varianza muestral de 50 valores alternos con el caso construido en que cada H identifica una de las dos fases. Para I5 calcular softmax estable sobre los diez costes emitidos y contrastar la decisión >0.5 contra el indicador histórico por barra. Para Φ contrastar ambos errores nulos en la serie constante de 80 precios.
- Transferencia en telemetría idéntica a escalas 1 y 1000. Ejecución técnica exige 130 filas activas y 129 errores finitos por escala. Conservación exige coincidencia por barra en teoría, señal, régimen, transición, Φ, θ y error normalizado. Utilidad en este banco exige MAE inferior a Random Walk en la misma escala.

SHA-256 del texto desde el título hasta el fin de esos criterios, incluido el salto de línea final, fijado antes de ejecutar los controles: `e47a319f8c94171e9787d69882c0c8d334c91f3f748a9ca13c9594c02360a7d5`.

## Ejecución y reproducción

Los diez archivos TypeScript coinciden entre los dos commits. Ejecuté dos veces el arnés intacto con Node v24.22.3. Las aserciones pasaron y `cmp` confirmó igualdad byte a byte. Ambas salidas dieron el SHA-256 del expediente, `917ba603d658c433358e0080da874e30a45871bf0d271fee3ebb156e4aff159e`. La discrepancia de la primera transición es de interpretación del JSON y se corrige abajo. Por separado, TypeScript 5.9.3 compiló los diez archivos con `--strict`, sin diagnósticos, y el instrumento independiente ejecutó el resultado CommonJS.

## Cierre por afirmación

### M1 · Objeto y contrato

**Reproducido.** Γ comprime el historial disponible en descriptores, GEI puntúa diez teorías y aplica margen y veto por ciclos, Φ mide reducción retrospectiva de error y Π aplica una política fuera del núcleo. La arquitectura y v5.7 permiten localizar esas fases. v5.4 §5.1 especifica Δprecio y v5.7 §2.6 expresa el error en diferencias de precio, mientras el candidato resta directamente el precio objetivo al valor de `predict`. Para una predicción de nivel bien definida, convertir predicción y objetivo a diferencias conserva el error absoluto. [v5.4](../../TN-LAB-Mathematical-Specification.md) · [v5.7](../../TN-LAB-CANONICAL-SCIENTIFIC-SPECIFICATION.md) · [Arquitectura](../../TN-LAB-Computational-Architecture.md)

### M2 · Unidades e invariantes

| Afirmación | Resultado y alcance |
| --- | --- |
| T1 es coherente en unidades | **Refutada.** Γ calcula la media adimensional de log-retornos, μ = 0.00087601 en el prefijo de 21 puntos de cambio de régimen, semilla 17. T1 usa α = 0.266098 y mezcla μ con el nivel 101.767459 en μ + α(μ − precio), obteniendo −27.079048. El error de nivel ante 101.813059 es 128.892107. Π usa μ − precio y compara su magnitud con σ = 0.00054509, también en log-retornos. Devuelve 0 con Φ observado de 0 y θ=0.5, y −1 al forzar Φ=1. [Γ](../../src/engine/gamma.ts) · [T1 y MAE](../../src/engine/theories.ts) · [Π](../../src/engine/phi.ts) |
| I1 implementa la varianza condicional de v5.4 | **Refutada la equivalencia.** La varianza muestral móvil de 50 valores alternos es 0.255102 y falla. En el ejemplo construido donde H identifica la fase, las dos varianzas condicionales son 0. Este control separa ambas formulaciones. I1 condicional para las trayectorias queda **NO EVALUADO**. |
| I2, I3 e I4 | **Reproducidos en el banco.** Γ coincide en su proyección matemática, con 20 autocorrelaciones y 33 potencias. `lastUpdate` cambia. Φ queda en [0,1] y cada tick tiene un identificador activo válido. También se reprodujeron `sampleSize` 0, 5 y 0 en los casos corto, con cero y con infinito del arnés. El dominio general queda **NO EVALUADO**. |
| I5 histórico equivale al softmax de v5.4 | **Refutada la equivalencia.** Costes iguales dan ln(10), activación única da 0. El softmax de los costes emitidos supera 0.5 en las 1.170 barras de las nueve trayectorias y discrepa del indicador histórico en 77. Esto evalúa la fórmula sobre los costes efectivos del candidato, con sus penalizaciones y guardas. El resultado para otras definiciones de coste queda **NO EVALUADO**. |
| Φ=1 implica mejora sobre la referencia | **Refutada en el caso cero.** En 80 precios constantes, el error de Random Walk y el de referencia son 0. La razón original 0/0 queda indefinida. El piso 1e-10 produce Φ=1 aun con empate. La equivalencia general entre las tres definiciones queda sin establecer. Por ejemplo, costes [0.7, 0.8] dan `computePhiMinCost` = 0 frente al −0.7 literal de la definición, y la entropía normalizada uniforme da 1 con sus propios insumos. |

### M3 · Cortes e integridad de la traza

- **Reproducido el corte externo** en las 70 filas comunes de la proyección del arnés. **Refutado el corte interno** con estadísticas de la ventana envolvente. La intervención de sufijo del arnés movió T1, T3 y T7 con prefijo fijo. El control independiente recalculó Γ por origen y cambió los MAE de las teorías 1, 2, 3, 5 y 7. Para T1, el MAE de ventana pasó de 120.340140 a 130.811262. En entrenamiento pasó de 118.367597 a 133.375105, en validación de 115.597015 a 124.999541, y el promedio 70/30 pasó de 117.536423 a 130.862436. La primera discrepancia está en el origen 2 (índice desde cero), con predicciones −20.212385 y 0. Γ devuelve estadísticas por defecto para un prefijo de tres puntos. Los valores del control incluyen ese arranque y conservan las filas del candidato. También la inestabilidad de GEI pasa estadísticas envolventes a sus predicciones internas. El efecto de cambiar todos estos insumos sobre la selección queda **NO EVALUADO**. [Error](../../src/engine/theories.ts) · [GEI](../../src/engine/gei.ts)
- **Reproducida la mutación, refutado el conteo inicial de cero.** En el tick 50, al insertar la primera fila, tenía **1 transición y 1 activación**. Al releer el mismo objeto tenía **22 transiciones y 130 activaciones** acumuladas en las colecciones compartidas. `createTransition` recibe `tick` pero lo omite del objeto creado. El filtro del arnés `transition.tick <= 50` devuelve cero porque el campo es `undefined` en las 22 transiciones. La captura en vivo corrige la evidencia sin modificar los archivos del candidato. Los campos `cycleDetected` y `cycleCount` permanecen en sus valores iniciales en el conductor. La incidencia de vetos internos queda **NO EVALUADA**. [Conductor](../../src/simulator/backtest.ts) · [Creación de transiciones](../../src/engine/gei.ts)
- **Reproducida la sensibilidad al régimen.** Cambiar solo la categoría 0/1/2/3 dio teorías 0/2/4/0. La contribución causal del régimen a un diferencial en datos externos queda **NO EVALUADA**.

### M4 · MAE emparejado

El instrumento con compilación independiente reprodujo los cuatro MAE, la teoría dominante y los conteos de cambios de cada trayectoria del JSON histórico. Los promedios por familia se calculan aquí antes de redondear, de ahí la diferencia de 0.000001 en T1 de cambio de régimen frente al promedio de valores ya redondeados del expediente.

| Familia, 387 objetivos cada una | GEI | Random Walk | Tendencia fija | T1 original | T1 con centro de precio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Deriva | 1.893573 | 0.084585 | 0.064768 | 117.580991 | 2.134120 |
| Reversión | 1.947177 | 0.159365 | 0.163740 | 115.521765 | 0.257508 |
| Cambio de régimen | 2.109409 | 0.251379 | 0.241230 | 112.865017 | 2.280050 |

GEI perdió frente a Random Walk en 9/9 y su teoría dominante fue la 8 en 9/9. El arnés también reprodujo los conteos de victorias GEI condicionadas a Φ>0 de 225/297, 18/50 y 98/181. El **control dimensional** reduce sustancialmente el MAE de T1, pero pierde frente a Random Walk en 9/9. El banco no permite estimar significancia ni generalizar el desempeño. La utilidad de integrar ese comparador en un selector adaptativo queda **NO EVALUADA**.

### M5 · Decisión

Mantener G0/G1 para investigación. Mantener G2 negativo para el GEI congelado en este banco y G5 aplazado para despliegue. G3 mejora en reproducibilidad con la compilación estricta y un segundo instrumento. Para confiar en una traza histórica hay que conservar el índice de la transición y capturar el estado al registrar la fila. La corrección del centro de T1 por sí sola deja G2 cerrado en el banco. Para evaluar una variante del selector queda abierta la definición del historial disponible por origen, con un contraste posterior fuera del banco usado para diseñarla. La eficacia de Π, la capacidad predictiva en mercado y la rentabilidad quedan **NO EVALUADAS**. [Playbook, §13.2](../program/RDL-PB-001_v0.1_original_propuesta.md)

### M6 · Transferencia

**Ejecución técnica reproducida**, con 130 filas, 129 objetivos finitos y 17 cambios en cada escala. **Conservación de comportamiento refutada**. En 130 filas difirieron la teoría en 1, la señal en 2, el marcador de transición en 2, Φ en 1 y θ en 40. Las primeras discrepancias de esas variables aparecen en el tick 140. El régimen coincidió en las 130 filas. Los errores GEI normalizados difirieron en 4 de 129 objetivos, desde el origen 91. El mismo número de transiciones oculta diferencias de trayectoria. **Utilidad frente a Random Walk refutada en ambas escalas del banco**. GEI obtuvo MAE normalizado de 1.178294483 y 1.178688011, frente a 0.175650964 para Random Walk en ambas. La transferencia a una familia física real queda **NO EVALUADA**.

### M7 · Reutilización y límites

El control independiente recompila el candidato, genera el mismo banco con aritmética entera exacta mediante BigInt, contrasta por trayectoria y observa el instante de inserción mediante una copia instrumentada del simulador compilado en memoria. Dos ejecuciones produjeron el mismo JSON. Esto establece independencia del cargador y del código de medición, con el mismo motor bajo estudio. La replicación de los experimentos históricos citados por v5.7, una reimplementación del motor y la productividad del laboratorio quedan **NO EVALUADAS**.

## Repetición

Desde la raíz de la rama de réplica, con Node 24.22.3, `tsc` 5.9.3 en PATH y acceso Git a la referencia, ejecutar en Bash. El arnés se extrae en un directorio temporal para conservar sus imports relativos y mantener limpio el checkout.

```bash
set -euo pipefail
reference=ceaf934efb37df8f456a08af0c6f047fb4a118e6
candidate=4217f70e2a140d03746873183dad5328a65e1fba
root=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
git cat-file -e "$reference^{commit}" || git fetch origin "$reference"
git diff --exit-code "$candidate" "$reference" -- src
git archive "$reference" src docs/research/tn_r01.mjs | tar -x -C "$tmp"
cd "$tmp"
node --disable-warning=ExperimentalWarning docs/research/tn_r01.mjs > a.json
node --disable-warning=ExperimentalWarning docs/research/tn_r01.mjs > b.json
cmp a.json b.json
printf '%s  %s\n' 917ba603d658c433358e0080da874e30a45871bf0d271fee3ebb156e4aff159e a.json | sha256sum -c -
tsc --strict --target ES2022 --module commonjs --rootDir src --outDir build \
  --noEmitOnError src/engine/*.ts src/simulator/*.ts
node "$root/docs/research/tn_r01_controls.cjs" build a.json > controls.json
sha256sum controls.json
```

SHA-256 de `controls.json` en esta ejecución: `ac98d176132883973938298f062431e2ea68ac6a8300c1e42bb8047e16e9855b`. El expediente y el código originales se consultan en la [referencia fijada](https://github.com/ksgfin8-cyber/tn-ea/tree/ceaf934efb37df8f456a08af0c6f047fb4a118e6/docs/research).
