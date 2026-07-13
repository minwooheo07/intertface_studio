package {{basePackage}}.dao;

import {{basePackage}}.vo.{{className}}Vo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * {{srcTable}} CRUD DAO
 * 생성: Interface Studio ({{ifId}})
 */
@Mapper
public interface {{className}}CrudDao {

    List<{{className}}Vo> selectAll();

    {{className}}Vo selectOne(@Param("id") String id);

    void insert({{className}}Vo vo);

    void update({{className}}Vo vo);

    void delete(@Param("id") String id);
}
