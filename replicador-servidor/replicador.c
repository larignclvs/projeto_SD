#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <time.h>

#define PORTA 8081
#define MAX_CONEXOES 5
#define BUFFER_SIZE 2048

// IPs e portas dos outros servidores (para replicar)
const char *SERVIDORES_REPLICA[3] = {"127.0.0.1", "127.0.0.1", "127.0.0.1"};
const int PORTAS_REPLICA[3] = {3001, 3002, 3003};  // ← novo servidor na porta 8084


int relogio_logico = 0;

// Salva a mensagem no log com relógio lógico e data/hora física
void salvar_log(const char *mensagem) {
    FILE *arquivo = fopen("logs/replica_c.log", "a");
    if (!arquivo) return;

    time_t agora = time(NULL);
    struct tm *info = localtime(&agora);
    char data_hora[64];
    strftime(data_hora, sizeof(data_hora), "%Y-%m-%d %H:%M:%S", info);

    fprintf(arquivo, "[%s] [Lamport: %d] %s\n", data_hora, relogio_logico, mensagem);
    fclose(arquivo);
}

// Envia a mensagem para os outros dois servidores
void replicar_para_outros(const char *mensagem) {
    for (int i = 0; i < 3; i++) {
        int sock = socket(AF_INET, SOCK_STREAM, 0);
        if (sock < 0) continue;

        struct sockaddr_in dest;
        dest.sin_family = AF_INET;
        dest.sin_port = htons(PORTAS_REPLICA[i]);
        inet_pton(AF_INET, SERVIDORES_REPLICA[i], &dest.sin_addr);

        if (connect(sock, (struct sockaddr *)&dest, sizeof(dest)) < 0) {
            printf("Falha ao conectar com servidor %d\n", i + 1);
            close(sock);
            continue;
        }

        send(sock, mensagem, strlen(mensagem), 0);
        close(sock);
    }
}

int main() {
    int servidor_fd, cliente_fd;
    struct sockaddr_in endereco;
    char buffer[BUFFER_SIZE];
    socklen_t addrlen = sizeof(endereco);

    servidor_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (servidor_fd < 0) {
        perror("Erro ao criar socket");
        exit(EXIT_FAILURE);
    }

    int opt = 1;
    setsockopt(servidor_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    endereco.sin_family = AF_INET;
    endereco.sin_addr.s_addr = INADDR_ANY;
    endereco.sin_port = htons(PORTA);

    if (bind(servidor_fd, (struct sockaddr *)&endereco, sizeof(endereco)) < 0) {
        perror("Erro no bind");
        exit(EXIT_FAILURE);
    }

    if (listen(servidor_fd, MAX_CONEXOES) < 0) {
        perror("Erro no listen");
        exit(EXIT_FAILURE);
    }

    printf(" Servidor replicador ouvindo na porta %d...\n", PORTA);

    while (1) {
        cliente_fd = accept(servidor_fd, (struct sockaddr *)&endereco, &addrlen);
        if (cliente_fd < 0) {
            perror("Erro no accept");
            continue;
        }

        memset(buffer, 0, BUFFER_SIZE);
        read(cliente_fd, buffer, BUFFER_SIZE);

        // Se a mensagem tiver um timestamp lógico: "timestamp:5|mensagem..."
        int timestamp_recebido = 0;
        char *separador = strstr(buffer, "|");
        if (separador != NULL) {
            sscanf(buffer, "timestamp:%d", &timestamp_recebido);
            relogio_logico = (relogio_logico > timestamp_recebido ? relogio_logico : timestamp_recebido) + 1;
        } else {
            relogio_logico++;  // nenhuma informação recebida, incrementa normalmente
        }

        printf("📨 Mensagem recebida com Lamport %d: %s\n", relogio_logico, buffer);
        salvar_log(buffer);
        replicar_para_outros(buffer);

        close(cliente_fd);
    }

    return 0;
}
