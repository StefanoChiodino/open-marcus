.PHONY: setup dev test lint typecheck clean

setup:
	python3 -m venv venv && ./venv/bin/pip install -r src/requirements.txt

dev:
	./venv/bin/flet run src/main.py

test:
	./venv/bin/python -m pytest src/tests/ -v

lint:
	./venv/bin/ruff check src/

typecheck:
	./venv/bin/python -m mypy src/ || true

clean:
	rm -rf venv
