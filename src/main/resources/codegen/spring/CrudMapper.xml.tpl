<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<!--
  {{srcTable}} CRUD Mapper
  생성: Interface Studio ({{ifId}})
  ⚠️ PK를 {{pkColumn}}로 가정했습니다. 실제 PK에 맞게 수정하세요.
-->
<mapper namespace="{{basePackage}}.dao.{{className}}CrudDao">

    <resultMap id="{{className}}Map" type="{{basePackage}}.vo.{{className}}Vo">
{{#srcFields}}
        <result property="{{javaName}}" column="{{columnName}}"/>
{{/srcFields}}
    </resultMap>

    <select id="selectAll" resultMap="{{className}}Map">
        SELECT {{columnList}}
          FROM {{srcTable}}
    </select>

    <select id="selectOne" resultMap="{{className}}Map">
        SELECT {{columnList}}
          FROM {{srcTable}}
         WHERE {{pkColumn}} = #{id}
    </select>

    <insert id="insert" parameterType="{{basePackage}}.vo.{{className}}Vo">
        INSERT INTO {{srcTable}} ({{columnList}})
        VALUES ({{insertValues}})
    </insert>

    <update id="update" parameterType="{{basePackage}}.vo.{{className}}Vo">
        UPDATE {{srcTable}}
           SET {{updateSet}}
         WHERE {{pkColumn}} = #{{{pkJavaName}}}
    </update>

    <delete id="delete">
        DELETE FROM {{srcTable}}
         WHERE {{pkColumn}} = #{id}
    </delete>
</mapper>
