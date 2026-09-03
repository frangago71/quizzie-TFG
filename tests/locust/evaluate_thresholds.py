import os
import sys
import csv

MAX_FAILURE_RATE_PERCENT = 1.0     # Tasa de error < 1%
MAX_HTTP_P90_MS = 200              # Latencia P90 HTTP REST <= 200ms
MAX_AUTH_P90_MS = 500              # Latencia P90 Autenticación y operaciones pesadas <= 500ms
MAX_WS_CONNECT_P90_MS = 200        # Latencia P90 WS Connect <= 200ms

def evaluate_thresholds(csv_path="tests/locust/benchmark_results_stats.csv"):
    """
    Analiza el archivo CSV de estadísticas generado por Locust y evalúa si se
    cumplen los umbrales fijos de calidad de servicio (SLA/QA) en el percentil 90 (P90).
    """
    if not os.path.exists(csv_path):
        print(f"\n[ERROR] No se encontró el archivo de resultados CSV en: {csv_path}")
        print("Ejecuta primero una prueba de rendimiento para generar el reporte de estadísticas.\n")
        return False

    all_passed = True
    evaluations = []

    try:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                req_type = row.get("Type", "").strip()
                name = row.get("Name", "").strip()
                req_count_str = row.get("Request Count", "0")
                fail_count_str = row.get("Failure Count", "0")
                p90_str = row.get("90%", "0")

                if not req_count_str or req_count_str == "N/A":
                    continue

                req_count = int(float(req_count_str))
                fail_count = int(float(fail_count_str))
                p90_val = float(p90_str) if p90_str and p90_str != "N/A" else 0.0

                # 1. Evaluación de Tasa de Errores Global (Fila Aggregated)
                if name == "Aggregated":
                    fail_rate = (fail_count / req_count * 100.0) if req_count > 0 else 0.0
                    passed = fail_rate < MAX_FAILURE_RATE_PERCENT
                    if not passed:
                        all_passed = False
                    evaluations.append({
                        "metric": "Tasa de Errores (Global)",
                        "actual": f"{fail_rate:.2f}%",
                        "threshold": f"< {MAX_FAILURE_RATE_PERCENT}%",
                        "passed": passed
                    })

                # 2. Evaluación de Latencia P90 HTTP REST y Autenticación
                elif req_type in ["GET", "POST", "PUT", "DELETE", "PATCH", "HTTP"]:
                    threshold_val = (
                        MAX_AUTH_P90_MS
                        if name in ["/users/login", "POST /users/login", "/content/quizzes/", "POST /content/quizzes/"]
                        else MAX_HTTP_P90_MS
                    )
                    passed = p90_val <= threshold_val
                    if not passed:
                        all_passed = False

                    # Limpiar prefijos duplicados si el nombre ya contiene el método HTTP
                    metric_label = name
                    if not any(name.startswith(m) for m in ["GET ", "POST ", "PUT ", "DELETE ", "PATCH "]):
                        metric_label = f"{req_type} {name}"

                    evaluations.append({
                        "metric": metric_label,
                        "actual": f"{p90_val:.0f} ms",
                        "threshold": f"<= {threshold_val:.0f} ms",
                        "passed": passed
                    })

                # 3. Evaluación de Latencia P90 WebSocket Connect
                elif req_type == "WebSocket" and name == "WS Connect":
                    passed = p90_val <= MAX_WS_CONNECT_P90_MS
                    if not passed:
                        all_passed = False
                    evaluations.append({
                        "metric": "WebSocket Connect",
                        "actual": f"{p90_val:.0f} ms",
                        "threshold": f"<= {MAX_WS_CONNECT_P90_MS} ms",
                        "passed": passed
                    })

    except Exception as e:
        print(f"\n[ERROR] Error procesando el reporte CSV: {e}")
        return False

    print("\n==========================================================================")
    print(" === INFORME DE EVALUACION DE UMBRALES DE RENDIMIENTO (P90) ===")
    print("==========================================================================")
    print(f" {'Metrica / Endpoint':<35} | {'Valor P90':<12} | {'Umbral':<12} | {'Estado'}")
    print("--------------------------------------------------------------------------")
    for ev in evaluations:
        status_str = "[OK]" if ev["passed"] else "[FALLO]"
        print(f" {ev['metric']:<35} | {ev['actual']:<12} | {ev['threshold']:<12} | {status_str}")
    print("--------------------------------------------------------------------------")
    if all_passed:
        print(" RESULTADO FINAL: TODAS LAS PRUEBAS DE RENDIMIENTO SUPERARON LOS UMBRALES [OK]")
    else:
        print(" RESULTADO FINAL: ALGUNOS UMBRALES DE RENDIMIENTO NO FUERON SUPERADOS [FALLO]")
    print("==========================================================================\n")

    return all_passed

if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "tests/locust/benchmark_results_stats.csv"
    success = evaluate_thresholds(csv_file)
    sys.exit(0 if success else 1)
