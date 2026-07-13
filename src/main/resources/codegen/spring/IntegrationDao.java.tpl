package {{basePackage}}.dao;

import {{basePackage}}.vo.{{className}}Vo;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Map;

/**
 * {{ifName}} 연동 DAO
 * 생성: Interface Studio ({{ifId}})
 */
@Mapper
public interface {{className}}Dao {

    /** 미전송 소스 데이터 조회 */
    List<{{className}}Vo> selectPending();

{{#isDbTarget}}
    /** 타겟 적재 */
    void insertTarget(Map<String, Object> params);
{{/isDbTarget}}

{{#hasMarkQuery}}
    /** 전송 완료 표시 */
    void markProcessed({{className}}Vo src);
{{/hasMarkQuery}}
}
