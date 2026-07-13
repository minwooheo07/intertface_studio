package com.ifstudio.ifengine.monitor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * SPA 클라이언트 라우팅 지원.
 * 확장자 없는 경로(정적 파일이 아님)를 index.html로 포워드해 새로고침/직접진입 404를 막는다.
 *
 * 안전장치:
 *  - 패턴 [^\.]* 로 점(.)이 든 경로(정적 리소스 .js/.css/.png 등)는 자연히 제외된다.
 *  - /api, /h2-console 로 시작하는 경로는 명시적으로 제외한다(각자 컨트롤러/콘솔이 처리).
 *  - 구체적 매핑(@RestController의 /api/**)이 이 정규식 매핑보다 우선하지만 이중으로 방어한다.
 */
@Controller
public class SpaForwardController {

    @GetMapping(value = {
            "/{path:[^\\.]*}",
            "/{p1:[^\\.]*}/{path:[^\\.]*}",
            "/{p1:[^\\.]*}/{p2:[^\\.]*}/{path:[^\\.]*}"
    })
    public String forward(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri.startsWith("/api") || uri.startsWith("/h2-console")) {
            // SPA로 넘기지 않음 → 해당 경로가 매핑이 없으면 404가 정상
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return "forward:/index.html";
    }
}
