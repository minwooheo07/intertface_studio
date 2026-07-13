package {{basePackage}}.controller;

import {{basePackage}}.service.{{className}}CrudService;
import {{basePackage}}.vo.{{className}}Vo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * {{srcTable}} CRUD Controller
 * 생성: Interface Studio ({{ifId}})
 *
 * ⚠️ 생성된 스캐폴드입니다. 권한 체크·검증·페이징을 업무 요건에 맞게 보완하세요.
 */
@RestController
@RequestMapping("/api/{{urlPath}}")
@RequiredArgsConstructor
public class {{className}}Controller {

    private final {{className}}CrudService service;

    @GetMapping
    public List<{{className}}Vo> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<{{className}}Vo> get(@PathVariable String id) {
        {{className}}Vo vo = service.findOne(id);
        return vo == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(vo);
    }

    @PostMapping
    public {{className}}Vo create(@RequestBody {{className}}Vo vo) {
        return service.create(vo);
    }

    @PutMapping("/{id}")
    public {{className}}Vo update(@PathVariable String id, @RequestBody {{className}}Vo vo) {
        return service.update(id, vo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
