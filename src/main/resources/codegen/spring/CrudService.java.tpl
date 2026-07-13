package {{basePackage}}.service;

import {{basePackage}}.dao.{{className}}CrudDao;
import {{basePackage}}.vo.{{className}}Vo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * {{srcTable}} CRUD Service
 * 생성: Interface Studio ({{ifId}})
 */
@Service
@RequiredArgsConstructor
public class {{className}}CrudService {

    private final {{className}}CrudDao dao;

    public List<{{className}}Vo> findAll() {
        return dao.selectAll();
    }

    public {{className}}Vo findOne(String id) {
        return dao.selectOne(id);
    }

    @Transactional
    public {{className}}Vo create({{className}}Vo vo) {
        dao.insert(vo);
        return vo;
    }

    @Transactional
    public {{className}}Vo update(String id, {{className}}Vo vo) {
        dao.update(vo);
        return vo;
    }

    @Transactional
    public void delete(String id) {
        dao.delete(id);
    }
}
