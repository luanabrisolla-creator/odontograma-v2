#!/usr/bin/env python3
"""Copia o compartilhado.js para dentro do index.html e do Codigo.gs (entre os marcadores COMPARTILHADO)."""
import pathlib
raiz = pathlib.Path(__file__).parent
I = '/* ===== COMPARTILHADO INICIO'; F = '/* ===== COMPARTILHADO FIM ===== */'
comp = (raiz / 'compartilhado.js').read_text().rstrip('\n')
for nome in ['index.html', 'Codigo.gs']:
    p = raiz / nome; s = p.read_text()
    i, j = s.index(I), s.index(F) + len(F)
    p.write_text(s[:i] + comp + s[j:])
    print('montado:', nome)
