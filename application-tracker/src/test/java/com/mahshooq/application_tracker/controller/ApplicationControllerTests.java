package com.mahshooq.application_tracker.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class ApplicationControllerTests {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String tokenA;
    private String tokenB;

    @BeforeEach
    void registerUsers() throws Exception {
        tokenA = registerAndGetToken();
        tokenB = registerAndGetToken();
    }

    private String registerAndGetToken() throws Exception {
        String username = "user" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + username + "\",\"email\":\"" + username
                        + "@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("token").asText();
    }

    @Test
    void createApplicationPersistsAllFields() throws Exception {
        mockMvc.perform(post("/api/applications")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyName\":\"Acme\",\"jobRole\":\"Engineer\",\"location\":\"Remote\","
                        + "\"jobUrl\":\"https://acme.example/jobs/1\",\"status\":\"APPLIED\","
                        + "\"dateApplied\":\"2024-01-01\",\"notes\":\"referral\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.companyName").value("Acme"))
                .andExpect(jsonPath("$.location").value("Remote"))
                .andExpect(jsonPath("$.jobUrl").value("https://acme.example/jobs/1"));
    }

    @Test
    void createApplicationWithInvalidJobUrlReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/applications")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyName\":\"Acme\",\"jobRole\":\"Engineer\",\"jobUrl\":\"not-a-url\","
                        + "\"status\":\"APPLIED\",\"dateApplied\":\"2024-01-01\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void usersOnlySeeTheirOwnApplications() throws Exception {
        mockMvc.perform(post("/api/applications")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyName\":\"OwnerCo\",\"jobRole\":\"Engineer\",\"status\":\"APPLIED\","
                        + "\"dateApplied\":\"2024-01-01\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/applications").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/applications").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void otherUserCannotUpdateDeleteOrChangeStatusOfSomeoneElsesApplication() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/applications")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyName\":\"Private\",\"jobRole\":\"Engineer\",\"status\":\"APPLIED\","
                        + "\"dateApplied\":\"2024-01-01\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/applications/" + id)
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyName\":\"Hijacked\",\"jobRole\":\"Engineer\",\"status\":\"APPLIED\","
                        + "\"dateApplied\":\"2024-01-01\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(patch("/api/applications/" + id + "/status")
                .header("Authorization", "Bearer " + tokenB)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"OFFER\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/applications/" + id)
                .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateStatusChangesOnlyStatus() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/applications")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyName\":\"StatusCo\",\"jobRole\":\"Engineer\",\"status\":\"APPLIED\","
                        + "\"dateApplied\":\"2024-01-01\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(patch("/api/applications/" + id + "/status")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"INTERVIEW\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INTERVIEW"))
                .andExpect(jsonPath("$.companyName").value("StatusCo"));
    }

    @Test
    void requestWithoutTokenIsRejected() throws Exception {
        mockMvc.perform(get("/api/applications"))
                .andExpect(status().isForbidden());
    }
}
