<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<!--
  {{ifName}} 연동 Mapper
  생성: Interface Studio ({{ifId}})
-->
<mapper namespace="{{basePackage}}.dao.{{className}}Dao">

    <resultMap id="{{className}}Map" type="{{basePackage}}.vo.{{className}}Vo">
{{#srcFields}}
        <result property="{{javaName}}" column="{{columnName}}"/>
{{/srcFields}}
    </resultMap>

    <!-- 미전송 소스 데이터 조회 (Interface Studio 소스 쿼리에서 생성) -->
    <select id="selectPending" resultMap="{{className}}Map">
        {{{srcQuery}}}
    </select>

{{#isDbTarget}}
    <!-- 타겟 적재 (Interface Studio 타겟 쿼리에서 생성) -->
    <insert id="insertTarget" parameterType="map">
        {{{tgtInsertQueryMyBatis}}}
    </insert>
{{/isDbTarget}}

{{#hasMarkQuery}}
    <!-- 전송 완료 표시 -->
    <update id="markProcessed" parameterType="{{basePackage}}.vo.{{className}}Vo">
        {{{srcMarkQueryMyBatis}}}
    </update>
{{/hasMarkQuery}}
</mapper>
