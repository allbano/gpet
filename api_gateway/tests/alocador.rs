use api_gateway::configuracao::ConfiguracaoGateway;
use serde_json::json;
use std::ffi::{c_int, c_void};

unsafe extern "C" {
    fn mi_version() -> c_int;
    fn mi_is_in_heap_region(p: *const c_void) -> bool;
}

#[test]
fn alocador_global_eh_mimalloc_em_alocacoes_padrao_do_rust() {
    let config = ConfiguracaoGateway::padrao();
    assert_eq!(config.endereco_escuta, "0.0.0.0:55569");

    let versao = unsafe { mi_version() };
    assert!(
        versao >= 300,
        "esperava mimalloc v3 ativo, obteve versão {versao}"
    );

    let mut buffer = Vec::<u8>::with_capacity(4096);
    buffer.extend_from_slice(b"gpet-mimalloc");
    let texto = String::from("alocacao-na-heap-do-mimalloc");
    let em_heap_vec = unsafe { mi_is_in_heap_region(buffer.as_ptr().cast()) };
    let em_heap_str = unsafe { mi_is_in_heap_region(texto.as_ptr().cast()) };
    let variavel_pilha = 42_u64;
    let em_pilha = unsafe { mi_is_in_heap_region((&raw const variavel_pilha).cast()) };

    assert!(em_heap_vec, "Vec<u8> deveria residir na heap do mimalloc");
    assert!(em_heap_str, "String deveria residir na heap do mimalloc");
    assert!(
        !em_pilha,
        "variável na pilha não pode constar na heap do mimalloc"
    );
}

#[test]
fn mimalloc_suporta_alocacao_e_desalocacao_cruzada_entre_threads_tokio() {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(4)
        .enable_all()
        .build()
        .unwrap();

    runtime.block_on(async {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<Vec<u8>>(256);

        for produtor in 0..8_u32 {
            let canal = tx.clone();
            tokio::spawn(async move {
                for sequencia in 0..200_u32 {
                    let payload = serde_json::to_vec(&json!({
                        "produtor": produtor,
                        "sequencia": sequencia,
                        "conteudo": "x".repeat(512),
                    }))
                    .unwrap();
                    canal.send(payload).await.unwrap();
                }
            });
        }
        drop(tx);

        let mut recebidos = 0_usize;
        while let Some(bloco) = rx.recv().await {
            let na_heap_mimalloc = unsafe { mi_is_in_heap_region(bloco.as_ptr().cast()) };
            assert!(na_heap_mimalloc);
            recebidos += 1;
            drop(bloco);
        }
        assert_eq!(recebidos, 1600);
    });
}
