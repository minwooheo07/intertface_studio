package {{basePackage}}.vo;

import lombok.Data;

/**
 * {{ifName}} - 소스 데이터 VO
 * 생성: Interface Studio ({{ifId}})
 */
@Data
public class {{className}}Vo {
{{#srcFields}}
    /** {{columnName}} */
    private {{javaType}} {{javaName}};
{{/srcFields}}
}
