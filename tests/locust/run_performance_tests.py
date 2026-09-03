import os
import sys
import argparse
import subprocess
import requests


def verify_server(host="http://127.0.0.1:8000"):
    """Verifica si el servidor FastAPI está en ejecución."""
    try:
        res = requests.get(f"{host}/docs", timeout=3)
        return res.status_code == 200
    except Exception:
        return False

def run_benchmark(host="http://127.0.0.1:8000", users=200, spawn_rate=15, run_time="1m"):
    print(f"\n==========================================================================")
    print(f" EJECUTANDO BENCHMARKING DE RENDIMIENTO Y ESTRÉS CON LOCUST")
    print(f" Servidor Objetivo: {host}")
    print(f" Usuarios Virtuales: {users} | Tasa de Creación: {spawn_rate}/s | Duración: {run_time}")
    print(f"==========================================================================\n")

    cmd = [
        "uv", "run", "locust",
        "-f", "tests/locust/locustfile.py",
        "--headless",
        "-u", str(users),
        "-r", str(spawn_rate),
        "--run-time", run_time,
        "--host", host,
        "--csv", "tests/locust/benchmark_results",
        "--exit-code-on-error", "0"
    ]

    process = subprocess.run(cmd, capture_output=True, text=True)
    print(process.stdout)

    if process.stderr:
        print("\n--- Salida Estándar de Error / Logs ---")
        print(process.stderr)

    return process.returncode

if __name__ == "__main__":

    parser = argparse.ArgumentParser(description="Ejecutar benchmarking de rendimiento con Locust y evaluación automática de umbrales fijos.")
    parser.add_argument("-u", "--users", type=int, default=200, help="Número de usuarios virtuales simultáneos (default: 200)")
    parser.add_argument("-r", "--spawn-rate", type=int, default=15, help="Tasa de creación de usuarios por segundo (default: 15)")
    parser.add_argument("-t", "--run-time", type=str, default="1m", help="Duración total de la prueba, ej. 30s, 1m (default: 1m)")
    parser.add_argument("--host", type=str, default="http://127.0.0.1:8000", help="URL objetivo del backend FastAPI (default: http://127.0.0.1:8000)")


    args = parser.parse_args()

    if not verify_server(args.host):
        print(f"ADVERTENCIA: El servidor FastAPI en {args.host} no parece estar levantado.")
        print("Puedes levantar el servidor en una terminal independiente con:")
        print("  uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000")
        print("O continuar si estás probando contra un entorno de staging diferente.\n")

    code = run_benchmark(
        host=args.host,
        users=args.users,
        spawn_rate=args.spawn_rate,
        run_time=args.run_time
    )
    sys.exit(code)
