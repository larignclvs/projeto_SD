import time
from datetime import datetime  # <-- import necessário para formatar a data

class Usuario:
    def __init__(self, nome):
        self.nome = nome
        self.seguidores = []
        self.relogio_logico = 0
        self.postagens = []
        self.notificacoes = []

    def seguir(self, outro_usuario):
        if self not in outro_usuario.seguidores:
            outro_usuario.seguidores.append(self)
            self._log(f"Seguiu {outro_usuario.nome}")
            with open("seguidores.txt", "a") as f:
                f.write(f"{self.nome}::{outro_usuario.nome}\n")
        else:
            self._log(f"Já seguia {outro_usuario.nome}")

    def postar(self, texto):
        self.relogio_logico += 1
        timestamp = time.time()
        postagem = {
            'autor': self.nome,
            'texto': texto,
            'timestamp_real': timestamp,
            'relogio_logico': self.relogio_logico
        }
        self.postagens.append(postagem)
        self._registrar_postagem(postagem)
        self._log(f"Fez uma postagem: {texto}")
        self._notificar_seguidores(postagem)

    def _notificar_seguidores(self, postagem):
        for seguidor in self.seguidores:
            seguidor.relogio_logico = max(seguidor.relogio_logico, self.relogio_logico) + 1
            mensagem = f"🔔 Notificação para {seguidor.nome}: {self.nome} postou: '{postagem['texto']}'"
            seguidor.notificacoes.append(mensagem)
            seguidor._log(f"Recebeu notificação da postagem de {self.nome}: {postagem['texto']}")

    def _registrar_postagem(self, postagem):
        # Converte o timestamp para uma data legível
        timestamp_formatado = datetime.fromtimestamp(postagem['timestamp_real']).strftime("%d/%m/%Y %H:%M:%S")
        with open("postagens.txt", "a") as f:
            f.write(f"{postagem['autor']} - {postagem['texto']} - {timestamp_formatado} - Lógico: {postagem['relogio_logico']}\n")

    def _log(self, mensagem):
        with open("log.txt", "a") as f:
            f.write(f"[{self.nome}] [{self.relogio_logico}] {mensagem}\n")
