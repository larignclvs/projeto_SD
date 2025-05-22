from usuario import Usuario
import os
import time
import requests
import random
import uuid

usuarios = {}

# Lista de servidores de mensagens
SERVIDORES_MENSAGENS = [
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003"
]

# Carrega usuários salvos do arquivo
if os.path.exists("../data/usuarios.txt"):
    with open("../data/usuarios.txt", "r") as f:
        for linha in f:
            nome = linha.strip()
            if nome and nome not in usuarios:
                usuarios[nome] = Usuario(nome)

# Carrega seguidores salvos do arquivo
if os.path.exists("../data/seguidores.txt"):
    with open("../data/seguidores.txt", "r") as f:
        for linha in f:
            partes = linha.strip().split("::")
            if len(partes) == 2:
                seguidor_nome, seguido_nome = partes
                if seguidor_nome in usuarios and seguido_nome in usuarios:
                    seguidor = usuarios[seguidor_nome]
                    seguido = usuarios[seguido_nome]
                    if seguidor not in seguido.seguidores:
                        seguido.seguidores.append(seguidor)

def menu():
    print("\n--- MENU ---")
    print("1. Criar novo usuário")
    print("2. Fazer postagem")
    print("3. Seguir outro usuário")
    print("4. Mostrar log de um usuário")
    print("5. Ver notificações")
    print("6. Resetar sistema")
    print("7. Enviar Mensagem Privada")
    print("8. Teste automatizado com 5 usuários")
    print("9. Mostrar relógios")
    print("10. Ajustar relógios dos servidores (aleatório)")
    print("11. Sair")

def criar_usuario():
    nome = input("Nome do novo usuário: ").strip()
    if nome in usuarios:
        print("Usuário já existe.")
    else:
        usuarios[nome] = Usuario(nome)
        with open("../data/usuarios.txt", "a") as f:
            f.write(nome + "\n")
        print(f"Usuário '{nome}' criado com sucesso!")

def fazer_postagem():
    nome = input("Nome do usuário: ").strip()
    if nome not in usuarios:
        print("Usuário não encontrado.")
        return
    texto = input("Digite o conteúdo da postagem: ").strip()
    usuarios[nome].postar(texto)
    print("Postagem feita com sucesso.")
    print("\nEnviando para todos os servidores de mensagens...")

    postagem_id = str(uuid.uuid4())  # gera um UUID único para a postagem

    payload = {
        "id": postagem_id,
        "nome": nome,
        "texto": texto,
        "timestamp": int(time.time() * 1000)
    }
    for servidor in SERVIDORES_MENSAGENS:
        try:
            response = requests.post(f"{servidor}/postar", json=payload)
            print(f"[{servidor}] Resposta: {response.json()}")
        except Exception as e:
            print(f"[{servidor}] Erro: {e}")

def enviar_msg():
    de = input("Remetente: ").strip()
    if de not in usuarios:
        print("Erro: Usuário remetente não cadastrado.")
        return
    para = input("Destinatário: ").strip()
    if para not in usuarios:
        print("Erro: Usuário destinatário não cadastrado.")
        return
    texto = input("Digite a mensagem: ").strip()
    
    msg_id = str(uuid.uuid4())  # Gera um ID único para a mensagem
    
    payload = {
        "id": msg_id,
        "de": de,
        "para": para,
        "texto": texto,
        "timestamp": int(time.time() * 1000)
    }

    print("\nEnviando para todos os servidores de mensagens...")
    for servidor in SERVIDORES_MENSAGENS:
        try:
            response = requests.post(f"{servidor}/enviar", json=payload)
            print(f"[{servidor}] Resposta: {response.json()}")
        except Exception as e:
            print(f"[{servidor}] Erro: {e}")

def seguir_usuario():
    seguidor = input("Quem vai seguir? ").strip()
    seguido = input("Quem será seguido? ").strip()
    if seguidor not in usuarios or seguido not in usuarios:
        print("Um ou ambos os usuários não existem.")
        return
    if seguidor == seguido:
        print("Você não pode seguir a si mesmo.")
        return
    usuarios[seguidor].seguir(usuarios[seguido])
    print(f"{seguidor} agora segue {seguido}.")

def mostrar_log():
    nome = input("Nome do usuário: ").strip()
    try:
        with open("../logs/log.txt", "r", encoding="latin-1") as f:
            logs = [linha for linha in f if f"[{nome}]" in linha]
        if logs:
            print("\n--- Log do usuário ---")
            for linha in logs:
                print(linha.strip())
        else:
            print("Nenhum log encontrado para esse usuário.")
    except FileNotFoundError:
        print("Arquivo de log ainda não existe.")

def ver_notificacoes():
    nome = input("Nome do usuário: ").strip()
    if nome not in usuarios:
        print("Usuário não encontrado.")
        return
    user = usuarios[nome]
    if user.notificacoes:
        print("\n--- Notificações ---")
        for notif in user.notificacoes:
            print(notif)
        user.notificacoes.clear()
    else:
        print("Sem notificações novas.")

def resetar_sistema():
    confirmacao = input("Tem certeza que deseja apagar todos os dados? (s/n): ").strip().lower()
    if confirmacao == "s":
        arquivos = ["../data/usuarios.txt", "../data/seguidores.txt", "../data/postagens.txt", "../data/log.txt"]
        for arquivo in arquivos:
            if os.path.exists(arquivo):
                with open(arquivo, "w") as f:
                    f.write("")  # Limpa o conteúdo
        usuarios.clear()  # Limpa os usuários em memória
        print("Sistema reiniciado com sucesso.")
    else:
        print("Cancelado.")

def teste_automatico():
    print("\nIniciando teste automatizado com 5 usuários...\n")
    nomes = ["Ana", "Beto", "Carol", "Davi", "Eva"]

    # Criar usuários
    for nome in nomes:
        if nome not in usuarios:
            usuarios[nome] = Usuario(nome)
            with open("../data/usuarios.txt", "a") as f:
                f.write(nome + "\n")
            print(f"Usuário '{nome}' criado.")
    time.sleep(1)

    # Cada usuário segue outro
    print("\nEstabelecendo seguidores...")
    for i, seguidor_nome in enumerate(nomes):
        seguido_nome = nomes[(i + 1) % len(nomes)]  # próximo da lista
        seguidor = usuarios[seguidor_nome]
        seguido = usuarios[seguido_nome]
        if seguidor not in seguido.seguidores:
            seguido.seguidores.append(seguidor)
            with open("../data/seguidores.txt", "a") as f:
                f.write(f"{seguidor_nome}::{seguido_nome}\n")
            print(f"{seguidor_nome} agora segue {seguido_nome}")

    time.sleep(1)

    # Postagens de cada usuário
    print("\nRealizando postagens automáticas...")
    for nome in nomes:
        texto = f"Oi, eu sou {nome} e esta é uma postagem automática."
        usuarios[nome].postar(texto)
        payload = {
            "id": str(uuid.uuid4()),
            "nome": nome,
            "texto": texto,
            "timestamp": int(time.time() * 1000)
        }
        for servidor in SERVIDORES_MENSAGENS:
            try:
                response = requests.post(f"{servidor}/postar", json=payload)
                status = response.status_code
                print(f"[POSTAGEM {nome}] {servidor}: Status {status} - {response.json()}")
            except Exception as e:
                print(f"[POSTAGEM {nome}] {servidor}: Erro {e}")
        time.sleep(0.5)

    # Mensagens privadas entre usuários
    print("\nEnviando mensagens privadas automáticas...")
    for i, remetente_nome in enumerate(nomes):
        destinatario_nome = nomes[(i + 1) % len(nomes)]
        texto = f"Mensagem automática de {remetente_nome} para {destinatario_nome}."
        payload = {
            "id": str(uuid.uuid4()),
            "de": remetente_nome,
            "para": destinatario_nome,
            "texto": texto,
            "timestamp": int(time.time() * 1000)
        }
        for servidor in SERVIDORES_MENSAGENS:
            try:
                response = requests.post(f"{servidor}/enviar", json=payload)
                status = response.status_code
                print(f"[MENSAGEM {remetente_nome}->{destinatario_nome}] {servidor}: Status {status} - {response.json()}")
            except Exception as e:
                print(f"[MENSAGEM {remetente_nome}->{destinatario_nome}] {servidor}: Erro {e}")
        time.sleep(0.5)

    print("\nTeste automático concluído com sucesso!\n")


def mostrar_relogios():
    print("\n--- Relógios atuais dos servidores ---")
    for servidor in SERVIDORES_MENSAGENS:
        try:
            response = requests.get(f"{servidor}/status")
            data = response.json()
            relogio = data.get("relogio", "Desconhecido")
            print(f"{servidor}: {relogio}")
        except Exception as e:
            print(f"Erro ao acessar {servidor}: {e}")

def ajustar_relogio_servidor():
    for servidor in SERVIDORES_MENSAGENS:
        ajuste = random.randint(-1000, 1000)  # ms
        novo_tempo = int(time.time() * 1000) + ajuste
        try:
            response = requests.post(f"{servidor}/sincronizar", json={"novoTempo": novo_tempo})
            print(f"{servidor}: Relógio ajustado com deslocamento {ajuste} ms")
        except Exception as e:
            print(f"Erro ao ajustar relógio de {servidor}: {e}")

def main():
    while True:
        menu()
        escolha = input("Escolha uma opção: ").strip()
        if escolha == "1":
            criar_usuario()
        elif escolha == "2":
            fazer_postagem()
        elif escolha == "3":
            seguir_usuario()
        elif escolha == "4":
            mostrar_log()
        elif escolha == "5":
            ver_notificacoes()
        elif escolha == "6":
            resetar_sistema()
        elif escolha == "7":
            enviar_msg()
        elif escolha == "8":
            teste_automatico()
        elif escolha == "9":
            mostrar_relogios()
        elif escolha == "10":
            ajustar_relogio_servidor()
        elif escolha == "11":
            print("Saindo...")
            break
        else:
            print("Opção inválida.")

if __name__ == "__main__":
    main()
